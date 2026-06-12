import { Transport } from "./Transport";
import { AudioContextManager } from "./AudioContextManager";

type TimeProvider = () => number;

class ClockSingleton {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private schedulerMs = 5;
  private _startTime = 0;
  private _lastFiredTick = 0;
  private _timeProvider: TimeProvider;

  onTick: ((tick: number) => void) | null = null;
  onBeat: ((beat: number) => void) | null = null;
  onBar: ((bar: number) => void) | null = null;
  onPosition: ((tick: number) => void) | null = null;

  constructor() {
    this._timeProvider = this._defaultProvider;
  }

  setTimeProvider(fn: TimeProvider): void {
    this._timeProvider = fn;
  }

  start(): void {
    if (this.timeoutId !== null) return;
    const now = this._timeProvider();
    const msPerTick = 60000 / Transport.bpm / Transport.ppqn;
    this._startTime = now - Transport.position * msPerTick;
    this._lastFiredTick = Transport.position;
    this._schedule();
  }

  stop(): void {
    if (this.timeoutId === null) return;
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  _reset(): void {
    this.stop();
    this._startTime = 0;
    this._lastFiredTick = 0;
    this.onTick = null;
    this.onBeat = null;
    this.onBar = null;
    this.onPosition = null;
    this._timeProvider = this._defaultProvider;
  }

  private _defaultProvider(): number {
    try {
      return AudioContextManager.getCurrentTime() * 1000;
    } catch {
      return performance.now();
    }
  }

  private _schedule(): void {
    this.timeoutId = setTimeout(() => this._process(), this.schedulerMs);
  }

  private _process(): void {
    if (Transport.state !== "playing") {
      this.stop();
      return;
    }

    const now = this._timeProvider();
    const msPerTick = 60000 / Transport.bpm / Transport.ppqn;
    if (msPerTick <= 0) { this._schedule(); return; }

    const currentTick = Math.floor((now - this._startTime) / msPerTick);

    if (currentTick > this._lastFiredTick) {
      Transport.setPosition(currentTick);
      this.onPosition?.(currentTick);

      for (let t = this._lastFiredTick; t < currentTick; t++) {
        this.onTick?.(t);

        if (t % Transport.ppqn === 0) {
          const beat = Math.floor(t / Transport.ppqn);
          this.onBeat?.(beat);

          if (beat % Transport.timeSignature.beats === 0) {
            this.onBar?.(Math.floor(beat / Transport.timeSignature.beats));
          }
        }
      }

      this._lastFiredTick = currentTick;
    }

    this._schedule();
  }
}

export const Clock = new ClockSingleton();
