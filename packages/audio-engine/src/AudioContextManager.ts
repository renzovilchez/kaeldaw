type AudioContextManagerState = "suspended" | "running" | "closed" | "uninitialized";

class AudioContextManagerSingleton {
  private ctx: AudioContext | null = null;
  private _state: AudioContextManagerState = "uninitialized";

  get state(): AudioContextManagerState {
    return this._state;
  }

  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this._state = this.ctx.state as AudioContextManagerState;
  }

  getInstance(): AudioContext {
    if (!this.ctx) throw new Error("AudioContext no inicializado");
    return this.ctx;
  }

  getCurrentTime(): number {
    if (!this.ctx) throw new Error("AudioContext no inicializado");
    return this.ctx.currentTime;
  }

  async resume(): Promise<void> {
    if (!this.ctx) throw new Error("AudioContext no inicializado");
    await this.ctx.resume();
    this._state = this.ctx.state as AudioContextManagerState;
  }

  async suspend(): Promise<void> {
    if (!this.ctx) throw new Error("AudioContext no inicializado");
    await this.ctx.suspend();
    this._state = this.ctx.state as AudioContextManagerState;
  }
}

export const AudioContextManager = new AudioContextManagerSingleton();
