import { AudioContextManager } from "./AudioContextManager";
import { Transport } from "./Transport";

export interface MidiEvent {
  tick: number;
  type: "on" | "off";
  note: number;
  velocity: number;
}

interface PendingEvent {
  sampleOffset: number;
  event: MidiEvent;
}

class AudioSchedulerSingleton {
  private _events: MidiEvent[] = [];
  private _eventIndex = 0;
  private _startAudioTime = 0;
  private _startTick = 0;
  private _running = false;
  private _pending: PendingEvent[] = [];

  noteOn: ((note: number, velocity: number) => void) | null = null;
  noteOff: ((note: number) => void) | null = null;
  onPosition: ((tick: number) => void) | null = null;

  get running(): boolean {
    return this._running;
  }

  setEvents(events: MidiEvent[]): void {
    this._events = events.slice().sort((a, b) => a.tick - b.tick);
  }

  start(startTick: number): void {
    this._startAudioTime = this._getAudioTime();
    this._startTick = startTick;
    this._eventIndex = this._findFirstEvent(startTick);
    this._running = true;
    this.onPosition?.(startTick);
  }

  stop(): void {
    this._running = false;
    this._eventIndex = 0;
    this._pending = [];
  }

  processBlock(blockStartTime: number, blockSize: number, sampleRate: number): void {
    if (!this._running) return;

    const ticksPerSecond = Transport.bpm * Transport.ppqn / 60;
    const blockDuration = blockSize / sampleRate;
    const blockEndTime = blockStartTime + blockDuration;

    const tickAtEnd = this._startTick + (blockEndTime - this._startAudioTime) * ticksPerSecond;

    while (this._eventIndex < this._events.length && this._events[this._eventIndex].tick <= tickAtEnd) {
      const ev = this._events[this._eventIndex];

      const eventTime = this._startAudioTime + (ev.tick - this._startTick) / ticksPerSecond;
      const sampleOffset = Math.round((eventTime - blockStartTime) * sampleRate);

      this._pending.push({
        sampleOffset: Math.max(0, Math.min(sampleOffset, blockSize - 1)),
        event: ev,
      });

      this._eventIndex++;
    }

    this._pending.sort((a, b) => a.sampleOffset - b.sampleOffset);

    const tickAtStart = this._startTick + (blockStartTime - this._startAudioTime) * ticksPerSecond;
    const currentTick = Math.floor(tickAtStart);
    Transport.setPosition(currentTick);
    this.onPosition?.(currentTick);
  }

  dispatchForSample(sampleIndex: number): void {
    while (this._pending.length > 0 && this._pending[0].sampleOffset <= sampleIndex) {
      const pe = this._pending.shift()!;
      if (pe.event.type === "on") {
        this.noteOn?.(pe.event.note, pe.event.velocity);
      } else {
        this.noteOff?.(pe.event.note);
      }
    }
  }

  getBeatPositions(
    blockStartTime: number,
    blockSize: number,
    sampleRate: number,
  ): Array<{ sampleOffset: number; isDownbeat: boolean }> {
    if (!this._running) return [];

    const ticksPerSecond = Transport.bpm * Transport.ppqn / 60;
    const blockEndTime = blockStartTime + blockSize / sampleRate;

    const blockStartTicks = this._startTick + (blockStartTime - this._startAudioTime) * ticksPerSecond;
    const blockEndTicks = this._startTick + (blockEndTime - this._startAudioTime) * ticksPerSecond;

    const firstBeat = Math.ceil(blockStartTicks / Transport.ppqn);
    const lastBeat = Math.floor(blockEndTicks / Transport.ppqn);

    const positions: Array<{ sampleOffset: number; isDownbeat: boolean }> = [];
    for (let beat = firstBeat; beat <= lastBeat; beat++) {
      const beatTick = beat * Transport.ppqn;
      const beatAudioTime = this._startAudioTime + (beatTick - this._startTick) / ticksPerSecond;
      const sampleOffset = Math.round((beatAudioTime - blockStartTime) * sampleRate);
      if (sampleOffset >= 0 && sampleOffset < blockSize) {
        positions.push({ sampleOffset, isDownbeat: beat % Transport.timeSignature.beats === 0 });
      }
    }
    return positions;
  }

  clearPending(): void {
    this._pending = [];
  }

  _reset(): void {
    this._events = [];
    this._eventIndex = 0;
    this._pending = [];
    this._running = false;
    this.noteOn = null;
    this.noteOff = null;
    this.onPosition = null;
  }

  private _getAudioTime(): number {
    try {
      return AudioContextManager.getCurrentTime();
    } catch {
      return performance.now() * 0.001;
    }
  }

  private _findFirstEvent(tick: number): number {
    let low = 0;
    let high = this._events.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this._events[mid].tick < tick) low = mid + 1;
      else high = mid;
    }
    return low;
  }
}

export const AudioScheduler = new AudioSchedulerSingleton();
