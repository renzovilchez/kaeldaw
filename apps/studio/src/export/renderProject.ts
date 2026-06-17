import { encodeWav, type ExportResult } from "@kaeldaw/project/wav-export";
import { useClipsStore } from "@kaeldaw/project/useClipsStore";
import { useMixerStore, type MixerChannel } from "@kaeldaw/project/useMixerStore";
import { Transport } from "@kaeldaw/audio-engine/Transport";
import { initWasmEffects, getDspModule, createWasmDelay, setWasmDelay, processWasmDelay, freeWasmDelay, createWasmReverb, setWasmReverb, processWasmReverb, freeWasmReverb } from "@kaeldaw/audio-engine/WasmEffects";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";

export type ExportProgress = { percent: number; stage: string };

interface MidiEvent {
  tick: number;
  note: number;
  velocity: number;
  type: "on" | "off";
  trackId: string;
}

export async function renderProject(
  sampleRate = 44100,
  onProgress?: (p: ExportProgress) => void,
): Promise<ExportResult> {
  onProgress?.({ percent: 0, stage: "Loading DSP engine..." });

  await initWasmEffects();
  const dsp = getDspModule();
  if (!dsp) throw new Error("Failed to load DSP engine");
  const { setDspModule, PolySynth } = await import("@kaeldaw/instruments/PolySynth");
  setDspModule(dsp as any);

  onProgress?.({ percent: 2, stage: "Reading project..." });

  const clips = useClipsStore.getState().clips;
  const channels = useMixerStore.getState().channels;
  const masterVolume = useMixerStore.getState().masterVolume;
  const bpm = Transport.bpm;
  const sr = sampleRate;
  const ppqn = Transport.ppqn;

  // Build channel map: trackId → MixerChannel
  const channelMap = new Map<string, MixerChannel>();
  for (const ch of channels) {
    channelMap.set(ch.id, ch);
  }

const TICKS_PER_BEAT_VISUAL = 24;
const VISUAL_TO_PPQN = Transport.ppqn / TICKS_PER_BEAT_VISUAL;

  // Collect all MIDI events with trackId
  const events: MidiEvent[] = [];
  for (const clip of clips) {
    const ch = channelMap.get(clip.trackId);
    if (ch?.mute) continue;
    const offset = clip.startOffset ?? 0;
    const clipEnd = clip.startTick + clip.durationTicks;
    for (const note of clip.notes) {
      const noteAbsStart = clip.startTick + note.startTick - offset;
      const noteAbsEnd = noteAbsStart + note.durationTicks;
      const clampedStart = Math.max(clip.startTick, noteAbsStart);
      const clampedEnd = Math.min(clipEnd, noteAbsEnd);
      if (clampedStart >= clampedEnd) continue;
      events.push({ tick: clampedStart * VISUAL_TO_PPQN, note: note.note, velocity: note.velocity, type: "on", trackId: clip.trackId });
      events.push({ tick: clampedEnd * VISUAL_TO_PPQN, note: note.note, velocity: 0, type: "off", trackId: clip.trackId });
    }
  }
  events.sort((a, b) => a.tick - b.tick);

  if (events.length === 0) {
    const empty = new Float32Array(sr);
    const masterBlob = new Blob([encodeWav(empty, sr, 16)], { type: "audio/wav" });
    return { master: masterBlob, tracks: new Map(), duration: 0, sampleRate: sr };
  }

  // Solo logic: if any channel has solo, only those channels play
  const soloChannels = new Set(channels.filter((ch) => ch.solo).map((ch) => ch.id));
  const hasSolo = soloChannels.size > 0;

  // Group events by trackId → per-channel synth
  const trackEvents = new Map<string, MidiEvent[]>();
  for (const ev of events) {
    if (hasSolo && !soloChannels.has(ev.trackId)) continue;
    const ch = channelMap.get(ev.trackId);
    if (!ch || ch.mute) continue;
    if (!trackEvents.has(ev.trackId)) trackEvents.set(ev.trackId, []);
    trackEvents.get(ev.trackId)!.push(ev);
  }

  // Calculate total duration
  const lastTick = events[events.length - 1].tick;
  const totalTicks = lastTick + ppqn; // one beat for release
  const tickDuration = 60 / bpm / ppqn;
  const totalSeconds = totalTicks * tickDuration + 0.5;
  const totalSamples = Math.ceil(sr * totalSeconds);
  const masterBuffer = new Float32Array(totalSamples * 2); // stereo interleaved

  onProgress?.({ percent: 5, stage: "Initializing effects..." });

  const delayHandle = createWasmDelay(sr, 2);
  setWasmDelay(delayHandle, 0.3, 0.4, 0.3);
  const reverbHandle = createWasmReverb(sr);
  setWasmReverb(reverbHandle, 0.5, 0.3, 0.5);
  const delayOn = PolySynthOutput.delayEnabled;
  const reverbOn = PolySynthOutput.reverbEnabled;

  onProgress?.({ percent: 6, stage: "Rendering tracks..." });

  const blockSize = 128;
  let totalProgress = 6;
  const progressRange = 90;

  let trackIdx = 0;
  for (const [trackId, evs] of trackEvents) {
    const ch = channelMap.get(trackId)!;
    const synth = new PolySynth(sr);

    onProgress?.({
      percent: totalProgress + Math.round((trackIdx / trackEvents.size) * progressRange),
      stage: `Rendering ${ch.name}...`,
    });

    let eventIdx = 0;
    const channelBuffer = new Float32Array(totalSamples * 2);

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

    // Apply channel volume and pan
    const angle = (ch.pan + 1) * Math.PI / 4;
    const panL = Math.cos(angle);
    const panR = Math.sin(angle);
    const vol = ch.volume * (hasSolo ? 1 : 1); // solo already filtered

    for (let i = 0; i < totalSamples; i++) {
      const l = channelBuffer[i * 2] * vol * panL;
      const r = channelBuffer[i * 2 + 1] * vol * panR;
      masterBuffer[i * 2] += l;
      masterBuffer[i * 2 + 1] += r;
    }

    trackIdx++;
  }

  onProgress?.({ percent: 97, stage: "Applying master effects..." });

  // Apply delay/reverb and master volume to master
  for (let i = 0; i < totalSamples; i++) {
    const left = masterBuffer[i * 2];
    const right = masterBuffer[i * 2 + 1];
    const mono = (left + right) * 0.5;

    let fx = mono;
    if (delayOn) fx = processWasmDelay(delayHandle, fx);
    if (reverbOn) fx = processWasmReverb(reverbHandle, fx);

    const fxL = left + fx * 0.5;
    const fxR = right + fx * 0.5;

    masterBuffer[i * 2] = fxL * masterVolume;
    masterBuffer[i * 2 + 1] = fxR * masterVolume;
  }

  // Cleanup effects
  freeWasmDelay(delayHandle);
  freeWasmReverb(reverbHandle);

  onProgress?.({ percent: 99, stage: "Encoding WAV..." });

  const masterBlob = new Blob([encodeWav(masterBuffer, sr, 24, 2)], { type: "audio/wav" });

  onProgress?.({ percent: 100, stage: "Done" });

  return {
    master: masterBlob,
    tracks: new Map(),
    duration: totalSeconds,
    sampleRate: sr,
  };
}
