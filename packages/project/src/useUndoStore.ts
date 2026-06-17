import { create } from "zustand";

export type UndoContext = "timeline" | "pianoRoll" | "mixer" | "tracks";

const MAX_HISTORY = 50;

function makeFlags(): Record<UndoContext, boolean> {
  return { timeline: false, pianoRoll: false, mixer: false, tracks: false };
}

const STORAGE_KEY = "kaeldaw-undo-context";

function loadPersistedContext(): UndoContext | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "timeline" || saved === "pianoRoll" || saved === "mixer" || saved === "tracks") return saved;
  return null;
}

export interface UndoStore {
  focusedContext: UndoContext | null;
  canUndo: Record<UndoContext, boolean>;
  canRedo: Record<UndoContext, boolean>;
  setFocusedContext: (ctx: UndoContext) => void;
  executeAction: (context: UndoContext, getSnapshot: () => unknown) => void;
  undo: (context: UndoContext, getCurrentState: () => unknown) => unknown | null;
  redo: (context: UndoContext, getCurrentState: () => unknown) => unknown | null;
  clearHistory: () => void;
}

const history: Record<UndoContext, unknown[]> = { timeline: [], pianoRoll: [], mixer: [], tracks: [] };
const redoStack: Record<UndoContext, unknown[]> = { timeline: [], pianoRoll: [], mixer: [], tracks: [] };

function updateFlags(set: (s: Partial<UndoStore>) => void) {
  set({
    canUndo: {
      timeline: history.timeline.length > 0,
      pianoRoll: history.pianoRoll.length > 0,
      mixer: history.mixer.length > 0,
      tracks: history.tracks.length > 0,
    },
    canRedo: {
      timeline: redoStack.timeline.length > 0,
      pianoRoll: redoStack.pianoRoll.length > 0,
      mixer: redoStack.mixer.length > 0,
      tracks: redoStack.tracks.length > 0,
    },
  });
}

export const useUndoStore = create<UndoStore>((set) => ({
  focusedContext: loadPersistedContext(),
  canUndo: makeFlags(),
  canRedo: makeFlags(),

  setFocusedContext: (ctx) => {
    localStorage.setItem(STORAGE_KEY, ctx);
    set({ focusedContext: ctx });
  },

  executeAction: (context, getSnapshot) => {
    history[context].push(getSnapshot());
    if (history[context].length > MAX_HISTORY) history[context].shift();
    redoStack[context] = [];
    updateFlags(set);
  },

  undo: (context, getCurrentState) => {
    const stack = history[context];
    if (stack.length === 0) return null;
    const snapshot = stack.pop()!;
    redoStack[context].push(getCurrentState());
    updateFlags(set);
    return snapshot;
  },

  redo: (context, getCurrentState) => {
    const stack = redoStack[context];
    if (stack.length === 0) return null;
    const snapshot = stack.pop()!;
    history[context].push(getCurrentState());
    updateFlags(set);
    return snapshot;
  },

  clearHistory: () => {
    for (const ctx of Object.keys(history) as UndoContext[]) {
      history[ctx] = [];
      redoStack[ctx] = [];
    }
    updateFlags(set);
  },
}));
