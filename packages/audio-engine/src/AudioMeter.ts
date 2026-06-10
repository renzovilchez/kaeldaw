import { AudioContextManager } from "./AudioContextManager";

class AudioMeterSingleton {
  private analyser: AnalyserNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private _level = 0;
  private _rafId: number | null = null;
  private _onLevel: ((level: number) => void) | null = null;

  get level(): number { return this._level; }

  set onLevel(cb: ((level: number) => void) | null) { this._onLevel = cb; }

  start(): void {
    if (this.oscillator) return;
    const ctx = AudioContextManager.getInstance();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(ctx.destination);

    this.oscillator = ctx.createOscillator();
    this.oscillator.type = "sine";
    this.oscillator.frequency.value = 55;
    this.oscillator.connect(this.analyser);
    this.oscillator.start();
    this._runLoop();
  }

  stop(): void {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    try { this.oscillator?.stop(); } catch { /* already stopped */ }
    this.oscillator?.disconnect();
    this.analyser?.disconnect();
    this.oscillator = null;
    this.analyser = null;
    this._level = 0;
    this._onLevel?.(0);
  }

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

export const AudioMeter = new AudioMeterSingleton();
