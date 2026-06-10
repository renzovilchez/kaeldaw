import { create } from "zustand";
import { useClipsStore, type MidiNoteData } from "./useClipsStore";

export type { MidiNoteData };

export interface MidiStore {
  clipId: number | null;
  notes: MidiNoteData[];
  nextId: number;
  loadForClip: (clipId: number, notes: MidiNoteData[]) => void;
  clear: () => void;
  addNote: (note: Omit<MidiNoteData, "id">, externalId?: number) => number;
  moveNote: (id: number, note: number, startTick: number) => void;
  resizeNote: (id: number, startTick: number, durationTicks: number) => void;
  removeNote: (id: number) => void;
  syncToClips: () => void;
}

export const useMidiStore = create<MidiStore>((set, get) => ({
  clipId: null,
  notes: [],
  nextId: 1,

  loadForClip: (clipId, notes) =>
    set({ clipId, notes, nextId: notes.length + 1 }),

  clear: () => set({ clipId: null, notes: [], nextId: 1 }),

  addNote: (note, externalId) => {
    const id = externalId ?? get().nextId;
    set((s) => ({ notes: [...s.notes, { ...note, id }], nextId: Math.max(get().nextId, id + 1) }));
    return id;
  },

  moveNote: (id, note, startTick) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, note, startTick } : n,
      ),
    })),

  resizeNote: (id, startTick, durationTicks) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, startTick, durationTicks } : n,
      ),
    })),

  removeNote: (id) =>
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

  syncToClips: () => {
    const { clipId, notes } = get();
    if (clipId !== null) {
      useClipsStore.getState().setClipNotes(clipId, notes);
    }
  },
}));
