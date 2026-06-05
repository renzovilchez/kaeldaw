import { describe, it, expect, vi } from "vitest";
import { UndoRedoManager, type Command } from "../CommandHistory";

function createCmd(name: string): Command {
  return {
    name,
    execute: vi.fn(),
    undo: vi.fn(),
  };
}

describe("UndoRedoManager", () => {
  it("execute(command) → undo stack size 1, redo stack empty", () => {
    const manager = new UndoRedoManager();
    const cmd = createCmd("test");
    manager.execute(cmd);
    expect(manager.undoStack).toHaveLength(1);
    expect(manager.redoStack).toHaveLength(0);
    expect(cmd.execute).toHaveBeenCalledOnce();
  });

  it("execute → undo → undo stack empty, redo stack size 1", () => {
    const manager = new UndoRedoManager();
    const cmd = createCmd("test");
    manager.execute(cmd);
    const result = manager.undo();
    expect(result).toBe(true);
    expect(manager.undoStack).toHaveLength(0);
    expect(manager.redoStack).toHaveLength(1);
    expect(cmd.undo).toHaveBeenCalledOnce();
  });

  it("execute → undo → redo → undo stack size 1, redo stack empty", () => {
    const manager = new UndoRedoManager();
    const cmd = createCmd("test");
    manager.execute(cmd);
    manager.undo();
    const result = manager.redo();
    expect(result).toBe(true);
    expect(manager.undoStack).toHaveLength(1);
    expect(manager.redoStack).toHaveLength(0);
    expect(cmd.execute).toHaveBeenCalledTimes(2);
  });

  it("multiple execute → undo stack crece secuencialmente", () => {
    const manager = new UndoRedoManager();
    const cmd1 = createCmd("a");
    const cmd2 = createCmd("b");
    const cmd3 = createCmd("c");
    manager.execute(cmd1);
    manager.execute(cmd2);
    manager.execute(cmd3);
    expect(manager.undoStack).toHaveLength(3);
    expect(manager.redoStack).toHaveLength(0);
  });

  it("undo con stack vacio → false, sin error", () => {
    const manager = new UndoRedoManager();
    const result = manager.undo();
    expect(result).toBe(false);
    expect(manager.undoStack).toHaveLength(0);
  });

  it("redo con stack vacio → false, sin error", () => {
    const manager = new UndoRedoManager();
    const result = manager.redo();
    expect(result).toBe(false);
    expect(manager.redoStack).toHaveLength(0);
  });

  it("execute tras undo (nueva rama) → redo stack se limpia", () => {
    const manager = new UndoRedoManager();
    const cmd1 = createCmd("a");
    const cmd2 = createCmd("b");
    const cmd3 = createCmd("c");
    manager.execute(cmd1);
    manager.execute(cmd2);
    manager.undo();
    expect(manager.redoStack).toHaveLength(1);
    manager.execute(cmd3);
    expect(manager.redoStack).toHaveLength(0);
    expect(manager.undoStack).toHaveLength(2);
  });

  it("maxHistory=3 con 4 executes → undo stack limitado a 3", () => {
    const manager = new UndoRedoManager(3);
    const cmds = [createCmd("a"), createCmd("b"), createCmd("c"), createCmd("d")];
    for (const cmd of cmds) manager.execute(cmd);
    expect(manager.undoStack).toHaveLength(3);
    expect(manager.undoStack[0].name).toBe("b");
    expect(manager.undoStack[2].name).toBe("d");
  });

  it("clear() → undo y redo stacks vacios", () => {
    const manager = new UndoRedoManager();
    manager.execute(createCmd("a"));
    manager.execute(createCmd("b"));
    manager.undo();
    manager.clear();
    expect(manager.undoStack).toHaveLength(0);
    expect(manager.redoStack).toHaveLength(0);
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
  });

  it("canUndo y canRedo reflejan estado correcto", () => {
    const manager = new UndoRedoManager();
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
    manager.execute(createCmd("a"));
    expect(manager.canUndo).toBe(true);
    expect(manager.canRedo).toBe(false);
    manager.undo();
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(true);
    manager.redo();
    expect(manager.canUndo).toBe(true);
    expect(manager.canRedo).toBe(false);
  });

  it("comando con name se refleja en undoStack/redoStack", () => {
    const manager = new UndoRedoManager();
    const cmd = createCmd("My Action");
    manager.execute(cmd);
    expect(manager.undoStack[0].name).toBe("My Action");
    manager.undo();
    expect(manager.redoStack[0].name).toBe("My Action");
  });
});
