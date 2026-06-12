import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";
import { AudioScheduler } from "@kaeldaw/audio-engine/AudioScheduler";
import { PolySynth, setDspModule, type SynthVoiceConfig } from "./PolySynth";
import { initWasmEffects, createWasmDelay, setWasmDelay, processWasmDelay, freeWasmDelay, createWasmReverb, setWasmReverb, processWasmReverb, freeWasmReverb } from "@kaeldaw/audio-engine/WasmEffects";

const BLOCK_SIZE = 256;

class PolySynthOutputSingleton {
  private synth: PolySynth | null = null;
  private processor: AudioNode | null = null;
  private gain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private _rafId: number | null = null;
  private _onLevel: ((level: number) => void) | null = null;

  private _delayHandle = -1;
  private _reverbHandle = -1;
  private _delayEnabled = false;
  private _reverbEnabled = false;
  private _metronomeEnabled = false;
  private _waveformBuf = new Float32Array(2048);
  private _waveformIdx = 0;

  set onLevel(cb: ((level: number) => void) | null) { this._onLevel = cb; }

  get synthInstance(): PolySynth | null { return this.synth; }

  get delayEnabled(): boolean { return this._delayEnabled; }
  get reverbEnabled(): boolean { return this._reverbEnabled; }

  getWaveformSamples(): Float32Array | null {
    if (this._waveformIdx === 0) return null;
    const out = new Float32Array(this._waveformBuf.length);
    for (let i = 0; i < this._waveformBuf.length; i++) {
      out[i] = this._waveformBuf[(this._waveformIdx + i) % this._waveformBuf.length];
    }
    return out;
  }

  setDelayEnabled(on: boolean): void { this._delayEnabled = on; }
  setReverbEnabled(on: boolean): void { this._reverbEnabled = on; }
  setMetronomeEnabled(on: boolean): void { this._metronomeEnabled = on; }

  async start(config?: Partial<SynthVoiceConfig>): Promise<void> {
    this.stop();
    await initWasmEffects();
    await AudioContextManager.resume();
    const dspMod = await import("kaeldaw-dsp");
    setDspModule(dspMod);
    // Pre-generate wavetables in the main thread, not the audio callback
    new dspMod.BandlimitedSaw(48000).free();
    new dspMod.BandlimitedSquare(48000).free();

    const ctx = AudioContextManager.getInstance();
    const sampleRate = ctx.sampleRate;

    this._delayHandle = createWasmDelay(sampleRate, 2);
    setWasmDelay(this._delayHandle, 0.4, 0.4, 0.3);

    this._reverbHandle = createWasmReverb(sampleRate);
    setWasmReverb(this._reverbHandle, 0.4, 0.3, 0.5);

    this.synth = new PolySynth(sampleRate, config);

    AudioScheduler.noteOn = (note, velocity) => this.synth?.noteOn(note, velocity);
    AudioScheduler.noteOff = (note) => this.synth?.noteOff(note);

    this.gain = ctx.createGain();
    this.gain.gain.value = 0.8;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.processor = ctx.createScriptProcessor(BLOCK_SIZE, 0, 2) as unknown as AudioNode;
    this._setupAudioCallback();

    this.processor.connect(this.gain);
    this.gain.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    this._runLoop();
  }

  private _setupAudioCallback(): void {
    (this.processor as unknown as ScriptProcessorNode).onaudioprocess =
      (e: AudioProcessingEvent) => {
        if (!this.synth) return;
        const output = e.outputBuffer;
        const sr = output.sampleRate;
        const blockStartTime = e.playbackTime;
        const left = output.getChannelData(0);
        const right = output.getChannelData(1);

        AudioScheduler.processBlock(blockStartTime, BLOCK_SIZE, sr);

        for (let i = 0; i < BLOCK_SIZE; i++) {
          AudioScheduler.dispatchForSample(i);
          const [l, r] = this.synth.process();
          let s = (l + r) / 2;
          if (this._delayEnabled) s = processWasmDelay(this._delayHandle, s);
          if (this._reverbEnabled) s = processWasmReverb(this._reverbHandle, s);
          left[i] = s;
          right[i] = s;
        }

        if (this._metronomeEnabled) {
          this._renderMetronome(blockStartTime, sr, left, right);
        }

        for (let i = 0; i < BLOCK_SIZE; i++) {
          this._waveformBuf[this._waveformIdx] = left[i];
          this._waveformIdx = (this._waveformIdx + 1) % this._waveformBuf.length;
        }
      };
  }

  private _renderMetronome(blockStartTime: number, sampleRate: number, left: Float32Array, right: Float32Array): void {
    const beats = AudioScheduler.getBeatPositions(blockStartTime, BLOCK_SIZE, sampleRate);
    if (beats.length === 0) return;

    const clickLen = Math.round(0.005 * sampleRate);

    for (const beat of beats) {
      const freq = beat.isDownbeat ? 2000 : 1200;
      const amp = beat.isDownbeat ? 0.5 : 0.3;
      const decay = beat.isDownbeat ? 600 : 800;

      for (let i = 0; i < clickLen && beat.sampleOffset + i < BLOCK_SIZE; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * decay);
        const sample = Math.sin(2 * Math.PI * freq * t) * amp * envelope;
        const idx = beat.sampleOffset + i;
        left[idx] += sample;
        right[idx] += sample;
      }
    }
  }

  stop(): void {
    this.synth?.allNotesOff();
    this.synth?.destroy();
    this.synth = null;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    try { const p = this.processor as unknown as { disconnect?: () => void }; p?.disconnect?.(); } catch { /* ok */ }
    try { this.gain?.disconnect(); } catch { /* ok */ }
    try { this.analyser?.disconnect(); } catch { /* ok */ }
    this.processor = null;
    this.gain = null;
    AudioScheduler.noteOn = null;
    AudioScheduler.noteOff = null;
    this.analyser = null;
    this._level = 0;
    this._onLevel?.(0);
    this._waveformIdx = 0;
    if (this._delayHandle >= 0) { freeWasmDelay(this._delayHandle); this._delayHandle = -1; }
    if (this._reverbHandle >= 0) { freeWasmReverb(this._reverbHandle); this._reverbHandle = -1; }
  }

  private _level = 0;
  private _runLoop(): void {
    if (!this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const loop = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      this._level = Math.min(1, Math.sqrt(sum / data.length) * 2.5);
      this._onLevel?.(this._level);
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }
}

export const PolySynthOutput = (() => {
  const key = Symbol.for("kaeldaw.PolySynthOutput");
  const g = globalThis as any;
  if (g[key]) g[key].stop();
  return g[key] ?? (g[key] = new PolySynthOutputSingleton());
})();
