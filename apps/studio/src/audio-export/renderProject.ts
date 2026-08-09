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
  createWasmDelay,
  setWasmDelay,
  processWasmDelay,
  freeWasmDelay,
  createWasmReverb,
  setWasmReverb,
  processWasmReverb,
  freeWasmReverb,
} from "@kaeldaw/audio-engine/WasmEffects";
import { buildMidiEvents, type MidiEvent } from "../shared/buildMidiEvents";

export type ExportProgress = { percent: number; stage: string };

function createDelay(sr: number) {
  const h = createWasmDelay(sr, 2);
  setWasmDelay(h, 0.3, 0.4, 0.3);
  return h;
}

function createReverb(sr: number) {
  const h = createWasmReverb(sr);
  setWasmReverb(h, 0.5, 0.3, 0.5);
  return h;
}

function processFxOnBuffer(
  buf: Float32Array,
  sr: number,
  insertDelay: boolean,
  insertReverb: boolean,
  totalSamples: number,
): void {
  let dh = -1,
    rh = -1;
  if (insertDelay) dh = createDelay(sr);
  if (insertReverb) rh = createReverb(sr);
  for (let i = 0; i < totalSamples; i++) {
    let m = (buf[i * 2] + buf[i * 2 + 1]) * 0.5;
    if (dh >= 0) m = processWasmDelay(dh, m);
    if (rh >= 0) m = processWasmReverb(rh, m);
    buf[i * 2] += m * 0.5;
    buf[i * 2 + 1] += m * 0.5;
  }
  if (dh >= 0) freeWasmDelay(dh);
  if (rh >= 0) freeWasmReverb(rh);
}

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

  const busBuffers: Map<string, Float32Array> = new Map();
  for (const bus of buses) {
    busBuffers.set(bus.id, new Float32Array(totalSamples * 2));
  }

  onProgress?.({ percent: 5, stage: "Initializing effects..." });

  onProgress?.({ percent: 6, stage: "Rendering tracks..." });

  const blockSize = 128;
  const totalProgress = 6;
  const progressRange = 85;

  let trackIdx = 0;
  for (const [trackId, evs] of trackEvents) {
    const ch = channelMap.get(trackId)!;

    onProgress?.({
      percent:
        totalProgress +
        Math.round((trackIdx / trackEvents.size) * progressRange),
      stage: `Rendering ${ch.name}...`,
    });

    const channelBuffer = new Float32Array(totalSamples * 2);

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
      let eventIdx = 0;
      for (let s = 0; s < totalSamples; s += blockSize) {
        const currentSec = s / sr;
        const currentTick = currentSec / tickDuration;
        while (eventIdx < evs.length && evs[eventIdx].tick <= currentTick) {
          const ev = evs[eventIdx++];
          if (ev.type === "on") sampler.noteOn(ev.note, ev.velocity);
          else sampler.noteOff(ev.note);
        }
        const block = sampler.processBlock(
          Math.min(blockSize, totalSamples - s),
        );
        for (let i = 0; i < block.length; i += 2) {
          const idx = s + i / 2;
          channelBuffer[idx * 2] += block[i];
          channelBuffer[idx * 2 + 1] += block[i + 1];
        }
      }
      sampler.destroy();
    } else {
      const synth = new PolySynth(sr);
      let eventIdx = 0;
      for (let s = 0; s < totalSamples; s += blockSize) {
        const currentSec = s / sr;
        const currentTick = currentSec / tickDuration;
        while (eventIdx < evs.length && evs[eventIdx].tick <= currentTick) {
          const ev = evs[eventIdx++];
          if (ev.type === "on") synth.noteOn(ev.note, ev.velocity);
          else synth.noteOff(ev.note);
        }
        const block = synth.processBlock(Math.min(blockSize, totalSamples - s));
        for (let i = 0; i < block.length; i += 2) {
          const idx = s + i / 2;
          channelBuffer[idx * 2] += block[i];
          channelBuffer[idx * 2 + 1] += block[i + 1];
        }
      }
      synth.destroy();
    }

    // Apply per-channel insert FX
    const chInsertDelay = ch.insertFx?.[0]?.enabled ?? false;
    const chInsertReverb = ch.insertFx?.[1]?.enabled ?? false;
    if (chInsertDelay || chInsertReverb) {
      let dh = -1,
        rh = -1;
      if (chInsertDelay) dh = createDelay(sr);
      if (chInsertReverb) rh = createReverb(sr);
      for (let i = 0; i < totalSamples; i++) {
        let m = (channelBuffer[i * 2] + channelBuffer[i * 2 + 1]) * 0.5;
        if (dh >= 0) m = processWasmDelay(dh, m);
        if (rh >= 0) m = processWasmReverb(rh, m);
        channelBuffer[i * 2] += m * 0.5;
        channelBuffer[i * 2 + 1] += m * 0.5;
      }
      if (dh >= 0) freeWasmDelay(dh);
      if (rh >= 0) freeWasmReverb(rh);
    }

    const angle = ((ch.pan + 1) * Math.PI) / 4;
    const panL = Math.cos(angle);
    const panR = Math.sin(angle);
    const vol = ch.volume;

    const chSends = ch.sends ?? [];
    const reverbSend = chSends.find((s) => s.busId === "reverb-bus");

    for (let i = 0; i < totalSamples; i++) {
      const l = channelBuffer[i * 2] * vol * panL;
      const r = channelBuffer[i * 2 + 1] * vol * panR;
      masterBuffer[i * 2] += l;
      masterBuffer[i * 2 + 1] += r;

      if (reverbSend && reverbSend.level > 0) {
        const bus = busBuffers.get("reverb-bus");
        if (bus) {
          const sendAmt = (l + r) * 0.5 * reverbSend.level;
          bus[i * 2] += sendAmt;
          bus[i * 2 + 1] += sendAmt;
        }
      }
    }

    trackIdx++;
  }

  onProgress?.({ percent: 92, stage: "Processing buses..." });

  for (const bus of buses) {
    const buf = busBuffers.get(bus.id);
    if (!buf) continue;

    const busInsertDelay =
      bus.insertFx?.find((f) => f.type === "delay")?.enabled ?? false;
    const busInsertReverb =
      bus.insertFx?.find((f) => f.type === "reverb")?.enabled ?? false;
    if (busInsertDelay || busInsertReverb) {
      processFxOnBuffer(buf, sr, busInsertDelay, busInsertReverb, totalSamples);
    }

    for (let i = 0; i < totalSamples; i++) {
      masterBuffer[i * 2] += buf[i * 2] * bus.volume;
      masterBuffer[i * 2 + 1] += buf[i * 2 + 1] * bus.volume;
    }
  }

  onProgress?.({ percent: 97, stage: "Applying master volume..." });

  for (let i = 0; i < totalSamples; i++) {
    masterBuffer[i * 2] *= masterVolume;
    masterBuffer[i * 2 + 1] *= masterVolume;
  }

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
