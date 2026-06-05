import { AudioContextManager } from "./AudioContextManager";

const FREQ_MIN = 20;
const FREQ_MAX = 8000;

export class SineOscillator {
  private osc: OscillatorNode;
  private gainNode: GainNode;
  private _started = false;
  private _frequency: number;
  private _gain: number;

  constructor() {
    const ctx = AudioContextManager.getInstance();
    this.osc = ctx.createOscillator();
    this.osc.type = "sine";
    this._frequency = 440;
    this.osc.frequency.value = this._frequency;

    this.gainNode = ctx.createGain();
    this._gain = 0.3;
    this.gainNode.gain.value = this._gain;

    this.osc.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);
  }

  get frequency(): number {
    return this._frequency;
  }

  set frequency(value: number) {
    this._frequency = Math.max(FREQ_MIN, Math.min(FREQ_MAX, value));
    this.osc.frequency.value = this._frequency;
  }

  get gain(): number {
    return this._gain;
  }

  set gain(value: number) {
    this._gain = Math.max(0, Math.min(1, value));
    this.gainNode.gain.value = this._gain;
  }

  get started(): boolean {
    return this._started;
  }

  start(): void {
    if (this._started) return;
    this.osc.start();
    this._started = true;
  }

  stop(): void {
    if (!this._started) return;
    this.osc.stop();
    this._started = false;
  }
}
