class AudioSchedulerSingleton {
  private _running = false;

  onPosition: ((tick: number) => void) | null = null;

  get running(): boolean {
    return this._running;
  }

  stop(): void {
    this._running = false;
  }

  _reset(): void {
    this._running = false;
    this.onPosition = null;
  }
}

export const AudioScheduler = new AudioSchedulerSingleton();
