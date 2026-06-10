import { create } from "zustand";

export interface ClipData {
  id: number;
  trackId: string;
  trackIndex: number;
  startTick: number;
  durationTicks: number;
  color: string;
  name: string;
  notes: MidiNoteData[];
}

export interface MidiNoteData {
  id: number;
  note: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
  color?: string;
}

export interface ClipsStore {
  clips: ClipData[];
  nextId: number;
  version: number;
  setClips: (clips: ClipData[]) => void;
  addClip: (clip: Omit<ClipData, "id" | "notes"> & { notes?: MidiNoteData[] }, externalId?: number) => number;
  moveClip: (id: number, startTick: number, trackIndex: number, trackId?: string) => void;
  resizeClip: (id: number, startTick: number, durationTicks: number) => void;
  removeClip: (id: number) => void;
  setClipNotes: (clipId: number, notes: MidiNoteData[]) => void;
  getClipsForTrack: (trackIndex: number) => ClipData[];
}

export const useClipsStore = create<ClipsStore>((set, get) => ({
  clips: [],
  nextId: 1,
  version: 0,

  setClips: (clips) => set({ clips, nextId: clips.length + 1, version: get().version + 1 }),

  addClip: (clip, externalId) => {
    const id = externalId ?? get().nextId;
    set((s) => ({ clips: [...s.clips, { ...clip, id, notes: clip.notes ?? [] }], nextId: Math.max(get().nextId, id + 1) }));
    return id;
  },

  moveClip: (id, startTick, trackIndex, trackId) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === id ? { ...c, startTick, trackIndex, ...(trackId !== undefined ? { trackId } : {}) } : c,
      ),
    })),

  resizeClip: (id, startTick, durationTicks) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === id ? { ...c, startTick, durationTicks } : c,
      ),
    })),

  removeClip: (id) =>
    set((s) => ({ clips: s.clips.filter((c) => c.id !== id) })),

  setClipNotes: (clipId, notes) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === clipId ? { ...c, notes } : c,
      ),
    })),

  getClipsForTrack: (trackIndex) =>
    get().clips.filter((c) => c.trackIndex === trackIndex),
}));
