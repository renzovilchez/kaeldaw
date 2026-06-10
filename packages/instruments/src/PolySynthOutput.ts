import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";
import { PolySynth, type SynthVoiceConfig } from "./PolySynth";
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

  set onLevel(cb: ((level: number) => void) | null) { this._onLevel = cb; }

  get synthInstance(): PolySynth | null { return this.synth; }

  get delayEnabled(): boolean { return this._delayEnabled; }
  get reverbEnabled(): boolean { return this._reverbEnabled; }

  setDelayEnabled(on: boolean): void { this._delayEnabled = on; }
  setReverbEnabled(on: boolean): void { this._reverbEnabled = on; }

  async start(config?: Partial<SynthVoiceConfig>): Promise<void> {
    if (this.synth) return;
    await initWasmEffects();

    const ctx = AudioContextManager.getInstance();
    const sampleRate = ctx.sampleRate;

    this._delayHandle = createWasmDelay(sampleRate, 2);
    setWasmDelay(this._delayHandle, 0.4, 0.4, 0.3);

    this._reverbHandle = createWasmReverb(sampleRate);
    setWasmReverb(this._reverbHandle, 0.4, 0.3, 0.5);

    this.synth = new PolySynth(sampleRate, config);

    this.gain = ctx.createGain();
    this.gain.gain.value = 0.5;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.processor = ctx.createScriptProcessor(BLOCK_SIZE, 0, 2) as unknown as AudioNode;
    (this.processor as unknown as ScriptProcessorNode).onaudioprocess =
      (e: AudioProcessingEvent) => {
        if (!this.synth) return;
        const output = e.outputBuffer;
        const block = this.synth.processBlock(BLOCK_SIZE);
        const left = output.getChannelData(0);
        const right = output.getChannelData(1);
        for (let i = 0; i < BLOCK_SIZE; i++) {
          let s = (block[i * 2] + block[i * 2 + 1]) / 2;
          if (this._delayEnabled) s = processWasmDelay(this._delayHandle, s);
          if (this._reverbEnabled) s = processWasmReverb(this._reverbHandle, s);
          left[i] = s;
          right[i] = s;
        }
      };

    this.processor.connect(this.gain);
    this.gain.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    this._runLoop();
  }

  stop(): void {
    this.synth?.allNotesOff();
    this.synth?.destroy();
    this.synth = null;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    try { (this.processor as { disconnect?: () => void })?.disconnect(); } catch { /* ok */ }
    try { this.gain?.disconnect(); } catch { /* ok */ }
    try { this.analyser?.disconnect(); } catch { /* ok */ }
    this.processor = null;
    this.gain = null;
    this.analyser = null;
    this._level = 0;
    this._onLevel?.(0);
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

export const PolySynthOutput = new PolySynthOutputSingleton();
