import { createStore } from "zustand/vanilla";
import type { CoreState } from "./types";
import { CoreHistory } from "./history";

export type CoreReducer = (state: CoreState) => CoreState;
export type CoreListener = (state: CoreState, previous: CoreState) => void;

export interface CoreStore {
  getState: () => CoreState;
  subscribe: (listener: CoreListener) => () => void;
  dispatch: (name: string, reducer: CoreReducer) => void;
  run: (name: string, reducer: CoreReducer) => CoreState;
  apply: (patch: Partial<CoreState>) => void;
  undo: () => boolean;
  redo: () => boolean;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reset: (state?: CoreState) => void;
  getHistorySize: () => number;
}

function cloneState(state: CoreState): CoreState {
  return structuredClone(state);
}

function bumpVersion(state: CoreState): CoreState {
  return {
    ...state,
    meta: { ...state.meta, historyVersion: state.meta.historyVersion + 1 },
  };
}

export function createCoreStore(initialState: CoreState): CoreStore {
  const store = createStore<CoreState>()(() => cloneState(initialState));
  const history = new CoreHistory();
  const listeners = new Set<CoreListener>();

  function notify(state: CoreState, previous: CoreState): void {
    for (const listener of listeners) {
      listener(state, previous);
    }
  }

  return {
    getState: () => store.getState(),

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispatch: (name, reducer) => {
      const before = store.getState();
      const reduced = reducer(before);
      if (reduced === before) return;
      const after = bumpVersion(reduced);
      const beforeClone = cloneState(before);
      const afterClone = cloneState(after);
      history.push({ name, before: beforeClone, after: afterClone });
      store.setState(after);
      notify(after, before);
    },

    run: (name, reducer) => {
      const before = store.getState();
      const reduced = reducer(before);
      if (reduced === before) return before;
      const after = bumpVersion(reduced);
      history.push({ name, before: cloneState(before), after: cloneState(after) });
      store.setState(after);
      notify(after, before);
      return after;
    },

    apply: (patch) => {
      const before = store.getState();
      const next = { ...before, ...patch };
      store.setState(next);
      notify(next, before);
    },

    undo: () => {
      const entry = history.undo();
      if (!entry) return false;
      const before = store.getState();
      store.setState(bumpVersion(entry.before));
      notify(entry.before, before);
      return true;
    },

    redo: () => {
      const entry = history.redo();
      if (!entry) return false;
      const before = store.getState();
      store.setState(bumpVersion(entry.after));
      notify(entry.after, before);
      return true;
    },

    clearHistory: () => {
      history.clear();
    },

    canUndo: () => history.canUndo,
    canRedo: () => history.canRedo,

    reset: (state) => {
      const next = state ? cloneState(state) : cloneState(initialState);
      const before = store.getState();
      history.clear();
      store.setState(next);
      notify(next, before);
    },

    getHistorySize: () => history.size,
  };
}
