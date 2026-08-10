import { useSyncExternalStore } from "react";

let currentClipId: number | null = null;
const listeners = new Set<() => void>();

function setClipId(id: number | null): void {
  currentClipId = id;
  for (const listener of listeners) listener();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): number | null {
  return currentClipId;
}

export const usePianoClipStore = {
  getState: () => ({ clipId: currentClipId, setClipId }),
  setClipId,
};

export function usePianoClipId(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
