import type { CoreState } from "./types";

export interface CoreHistoryEntry {
  name: string;
  before: CoreState;
  after: CoreState;
}

const DEFAULT_MAX_HISTORY = 100;

export class CoreHistory {
  private _stack: CoreHistoryEntry[] = [];
  private _redo: CoreHistoryEntry[] = [];
  private readonly _maxHistory: number;

  constructor(maxHistory: number = DEFAULT_MAX_HISTORY) {
    this._maxHistory = Math.max(1, maxHistory);
  }

  get canUndo(): boolean {
    return this._stack.length > 0;
  }

  get canRedo(): boolean {
    return this._redo.length > 0;
  }

  get size(): number {
    return this._stack.length;
  }

  push(entry: CoreHistoryEntry): void {
    this._stack.push(entry);
    if (this._stack.length > this._maxHistory) {
      this._stack.shift();
    }
    this._redo = [];
  }

  undo(): CoreHistoryEntry | null {
    const entry = this._stack.pop();
    if (!entry) return null;
    this._redo.push(entry);
    return entry;
  }

  redo(): CoreHistoryEntry | null {
    const entry = this._redo.pop();
    if (!entry) return null;
    this._stack.push(entry);
    return entry;
  }

  clear(): void {
    this._stack = [];
    this._redo = [];
  }
}
