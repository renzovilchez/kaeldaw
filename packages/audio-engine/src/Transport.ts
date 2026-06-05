export type TransportState = "stopped" | "playing" | "paused";

interface TimeSignature {
  beats: number;
  beatValue: number;
}

export class TransportSingleton {
  private _state: TransportState = "stopped";
  private _bpm = 120;
  private _ppqn = 960;
  private _timeSignature: TimeSignature = { beats: 4, beatValue: 4 };
  private _position = 0;

  get state(): TransportState {
    return this._state;
  }

  get bpm(): number {
    return this._bpm;
  }

  get ppqn(): number {
    return this._ppqn;
  }

  get timeSignature(): TimeSignature {
    return { ...this._timeSignature };
  }

  get position(): number {
    return this._position;
  }

  play(): void {
    this._state = "playing";
  }

  stop(): void {
    this._state = "stopped";
    this._position = 0;
  }

  pause(): void {
    this._state = "paused";
  }

  setBpm(bpm: number): void {
    if (bpm < 20 || bpm > 300) return;
    this._bpm = bpm;
  }

  setTimeSignature(beats: number, beatValue: number): void {
    if (beats < 1 || beatValue < 1) return;
    this._timeSignature = { beats, beatValue };
  }

  advancePosition(ticks: number): void {
    if (ticks < 0) return;
    this._position += ticks;
  }

  resetPosition(): void {
    this._position = 0;
  }

  _reset(): void {
    this._state = "stopped";
    this._bpm = 120;
    this._position = 0;
    this._timeSignature = { beats: 4, beatValue: 4 };
  }
}

export const Transport = new TransportSingleton();
