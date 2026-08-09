import { encodeWav, type ExportResult } from "@kaeldaw/project/wav-export";
import { useClipsStore } from "@kaeldaw/project/useClipsStore";
import {
  useMixerStore,
  type MixerChannel,
} from "@kaeldaw/project/useMixerStore";
import { useTracksStore } from "@kaeldaw/project/useTracksStore";
import { Transport } from "@kaeldaw/audio-engine/Transport";
import {
  initWasmEffects,
  getDspModule,
} from "@kaeldaw/audio-engine/WasmEffects";
import { buildMidiEvents, type MidiEvent } from "../shared/buildMidiEvents";

export type ExportProgress = { percent: number; stage: string };

type TrackEngine = {
  engine:
    | import("@kaeldaw/instruments/PolySynth").PolySynth
    | import("@kaeldaw/instruments/Sampler").Sampler;
  events: MidiEvent[];
  eventIdx: number;
};

export async function renderProject(
  sampleRate = 44100,
  onProgress?: (p: ExportProgress) => void,
): Promise<ExportResult> {
  onProgress?.({ percent: 0, stage: "Loading DSP engine..." });

  await initWasmEffects();
  const dsp = getDspModule();
  if (!dsp) throw new Error("Failed to load DSP engine");
  const { setDspModule: setSynthDsp, PolySynth } =
    await import("@kaeldaw/instruments/PolySynth");
  const { setDspModule: setSamplerDsp, Sampler } =
    await import("@kaeldaw/instruments/Sampler");
  setSynthDsp(dsp as Parameters<typeof setSynthDsp>[0]);
  setSamplerDsp(dsp as Parameters<typeof setSamplerDsp>[0]);

  onProgress?.({ percent: 2, stage: "Reading project..." });

  const clips = useClipsStore.getState().clips;
  const channels = useMixerStore.getState().channels;
  const buses = useMixerStore.getState().buses;
  const masterVolume = useMixerStore.getState().masterVolume;
  const bpm = Transport.bpm;
  const sr = sampleRate;
  const ppqn = Transport.ppqn;

  const channelMap = new Map<string, MixerChannel>();
  for (const ch of channels) {
    channelMap.set(ch.id, ch);
  }

  const events = buildMidiEvents(clips)
    .filter((ev) => {
      const ch = channelMap.get(ev.channelId);
      return !ch?.mute;
    })
    .sort((a, b) => a.tick - b.tick);

  if (events.length === 0) {
    const empty = new Float32Array(sr);
    const masterBlob = new Blob([encodeWav(empty, sr, 16)], {
      type: "audio/wav",
    });
    return {
      master: masterBlob,
      tracks: new Map(),
      duration: 0,
      sampleRate: sr,
    };
  }

  const soloChannels = new Set(
    channels.filter((ch) => ch.solo).map((ch) => ch.id),
  );
  const hasSolo = soloChannels.size > 0;

  const trackEvents = new Map<string, MidiEvent[]>();
  for (const ev of events) {
    if (hasSolo && !soloChannels.has(ev.channelId)) continue;
    const ch = channelMap.get(ev.channelId);
    if (!ch || ch.mute) continue;
    if (!trackEvents.has(ev.channelId)) trackEvents.set(ev.channelId, []);
    trackEvents.get(ev.channelId)!.push(ev);
  }

  const lastTick = events[events.length - 1].tick;
  const totalTicks = lastTick + ppqn;
  const tickDuration = 60 / bpm / ppqn;
  const totalSeconds = totalTicks * tickDuration + 0.5;
  const totalSamples = Math.ceil(sr * totalSeconds);
  const masterBuffer = new Float32Array(totalSamples * 2);

  onProgress?.({ percent: 5, stage: "Initializing mixer..." });

  const mixer = new dsp.Mixer(sr);
  mixer.set_master_volume(masterVolume);
  const channelIndex = new Map<string, number>();
  const busIndex = new Map<string, number>();
  for (const bus of buses) {
    const index = mixer.add_bus();
    busIndex.set(bus.id, index);
    mixer.set_bus_volume(index, bus.volume);
    const busInsertDelay =
      bus.insertFx?.find((f) => f.type === "delay")?.enabled ?? false;
    const busInsertReverb =
      bus.insertFx?.find((f) => f.type === "reverb")?.enabled ?? false;
    mixer.set_bus_insert_delay(index, busInsertDelay);
    mixer.set_bus_insert_reverb(index, busInsertReverb);
  }
  for (const ch of channels) {
    const index = mixer.add_channel();
    channelIndex.set(ch.id, index);
    mixer.set_channel_volume(index, ch.volume);
    mixer.set_channel_pan(index, ch.pan);
    mixer.set_channel_mute(index, ch.mute);
    mixer.set_channel_solo(index, ch.solo);
    mixer.set_channel_insert_delay(index, ch.insertFx?.[0]?.enabled ?? false);
    mixer.set_channel_insert_reverb(index, ch.insertFx?.[1]?.enabled ?? false);
    for (const send of ch.sends ?? []) {
      const busIdx = busIndex.get(send.busId);
      if (busIdx !== undefined) {
        mixer.set_channel_send(index, busIdx, send.level);
      }
    }
  }

  onProgress?.({ percent: 6, stage: "Rendering tracks..." });

  const blockSize = 128;
  const engines = new Map<string, TrackEngine>();

  for (const [trackId, evs] of trackEvents) {
    const ch = channelMap.get(trackId)!;
    const trackData = useTracksStore
      .getState()
      .tracks.find((t) => t.id === trackId);
    const isSampler = trackData?.presetEngine === "sampler";
    if (isSampler) {
      const { SampleCache } = await import("@kaeldaw/instruments/SampleCache");
      const sampler = new Sampler(sr);
      const sid = trackData?.sampleId;
      if (sid) {
        const data = SampleCache.get(sid);
        if (data) {
          const meta = SampleCache.getMeta(sid);
          const rootNote =
            (ch as MixerChannel & { rootNote?: number }).rootNote ?? 60;
          sampler.setSample(data, meta?.sampleRate ?? sr, rootNote);
        }
      }
      engines.set(trackId, { engine: sampler, events: evs, eventIdx: 0 });
    } else {
      engines.set(trackId, {
        engine: new PolySynth(sr),
        events: evs,
        eventIdx: 0,
      });
    }
  }

  for (let s = 0; s < totalSamples; s += blockSize) {
    const blockLen = Math.min(blockSize, totalSamples - s);
    const currentTick = (s / sr) / tickDuration;

    for (const entry of engines.values()) {
      while (
        entry.eventIdx < entry.events.length &&
        entry.events[entry.eventIdx].tick <= currentTick
      ) {
        const ev = entry.events[entry.eventIdx++];
        if (ev.type === "on") entry.engine.noteOn(ev.note, ev.velocity);
        else entry.engine.noteOff(ev.note);
      }
    }

    const buffers = new Map<string, Float32Array>();
    for (const [trackId, entry] of engines) {
      buffers.set(trackId, entry.engine.processBlock(blockLen));
    }

    for (let i = 0; i < blockLen; i++) {
      for (const [trackId, buf] of buffers) {
        mixer.process_channel_index(channelIndex.get(trackId) ?? 0, buf[i * 2], buf[i * 2 + 1]);
      }
      mixer.finish_frame();
      const idx = s + i;
      masterBuffer[idx * 2] = mixer.get_master_left();
      masterBuffer[idx * 2 + 1] = mixer.get_master_right();
    }

    onProgress?.({
      percent: 6 + Math.round((s / totalSamples) * 90),
      stage: "Rendering...",
    });
  }

  for (const entry of engines.values()) {
    entry.engine.destroy();
  }
  mixer.free();

  onProgress?.({ percent: 99, stage: "Encoding WAV..." });

  const masterBlob = new Blob([encodeWav(masterBuffer, sr, 24, 2)], {
    type: "audio/wav",
  });

  onProgress?.({ percent: 100, stage: "Done" });

  return {
    master: masterBlob,
    tracks: new Map(),
    duration: totalSeconds,
    sampleRate: sr,
  };
}
