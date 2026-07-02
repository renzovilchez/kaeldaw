import { useUndoStore, type UndoContext } from "@kaeldaw/project/useUndoStore";

export function createUndoRedo<T>(
  context: UndoContext,
  takeSnapshot: () => T,
  applySnapshot: (snap: T) => void,
) {
  return {
    undo: () => {
      const snap = useUndoStore.getState().undo(context, takeSnapshot);
      if (snap) applySnapshot(snap as T);
    },
    redo: () => {
      const snap = useUndoStore.getState().redo(context, takeSnapshot);
      if (snap) applySnapshot(snap as T);
    },
  };
}
