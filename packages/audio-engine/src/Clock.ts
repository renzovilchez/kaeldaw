import { Transport } from "./Transport";

type TimeProvider = () => number;

class ClockSingleton {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lookaheadMs = 25;
  private lastTickTime = 0;
  private lastFiredTick = 0;
  private _timeProvider: TimeProvider = () => performance.now();

  onTick: ((tick: number) => void) | null = null;
  onBeat: ((beat: number) => void) | null = null;
  onBar: ((bar: number) => void) | null = null;

  setTimeProvider(fn: TimeProvider): void {
    this._timeProvider = fn;
  }

  start(): void {
    if (this.intervalId !== null) return;
    this.lastTickTime = this._timeProvider();
    this.lastFiredTick = Transport.position;
    this.intervalId = setInterval(() => this.process(), this.lookaheadMs);
  }

  stop(): void {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  _reset(): void {
    this.stop();
    this.lastTickTime = 0;
    this.lastFiredTick = 0;
    this.onTick = null;
    this.onBeat = null;
    this.onBar = null;
    this._timeProvider = () => performance.now();
  }

  private process(): void {
    if (Transport.state !== "playing") {
      this.stop();
      return;
    }

    const now = this._timeProvider();
    const msPerTick = 60000 / Transport.bpm / Transport.ppqn;

    if (msPerTick <= 0) return;

    const elapsed = now - this.lastTickTime;
    const ticksToAdvance = elapsed / msPerTick;

    if (ticksToAdvance < 1) return;

    const wholeTicks = Math.floor(ticksToAdvance);
    Transport.advancePosition(wholeTicks);

    const newPosition = Transport.position;

    for (let t = this.lastFiredTick; t < newPosition; t++) {
      this.onTick?.(t);

      if (t % Transport.ppqn === 0) {
        const beat = Math.floor(t / Transport.ppqn);
        this.onBeat?.(beat);

        if (beat % Transport.timeSignature.beats === 0) {
          this.onBar?.(Math.floor(beat / Transport.timeSignature.beats));
        }
      }
    }

    this.lastFiredTick = newPosition;
    this.lastTickTime = now - (elapsed % msPerTick);
  }
}

export const Clock = new ClockSingleton();
