export interface Command {
  readonly name: string;
  execute(): void;
  undo(): void;
}

export class UndoRedoManager {
  private _undoStack: Command[] = [];
  private _redoStack: Command[] = [];
  private readonly _maxHistory: number;

  constructor(maxHistory: number = 100) {
    this._maxHistory = Math.max(1, maxHistory);
  }

  get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  get undoStack(): readonly Command[] {
    return [...this._undoStack];
  }

  get redoStack(): readonly Command[] {
    return [...this._redoStack];
  }

  get maxHistory(): number {
    return this._maxHistory;
  }

  execute(command: Command): void {
    command.execute();
    this._undoStack.push(command);
    if (this._undoStack.length > this._maxHistory) {
      this._undoStack.shift();
    }
    this._redoStack = [];
  }

  undo(): boolean {
    const command = this._undoStack.pop();
    if (!command) return false;
    command.undo();
    this._redoStack.push(command);
    return true;
  }

  redo(): boolean {
    const command = this._redoStack.pop();
    if (!command) return false;
    command.execute();
    this._undoStack.push(command);
    return true;
  }

  clear(): void {
    this._undoStack = [];
    this._redoStack = [];
  }
}
