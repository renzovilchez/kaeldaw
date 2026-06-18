import { create } from "zustand";
import type { ProjectTrack } from "./schema";

export interface TracksStore {
  tracks: (ProjectTrack & { color: string; presetId: string })[];
  selectedId: string | null;
  addTrack: (name?: string, presetId?: string) => void;
  removeTrack: (id: string) => void;
  renameTrack: (id: string, name: string) => void;
  selectTrack: (id: string | null) => void;
  setTrackColor: (id: string, color: string) => void;
  setTrackPreset: (id: string, presetId: string) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;
  clearTracks: () => void;
}

let trackCounter = 0;

export const useTracksStore = create<TracksStore>((set) => ({
  tracks: [],
  selectedId: null,
  addTrack: (name?: string, presetId = "poly-saw") => {
    trackCounter++;
    const track = {
      id: crypto.randomUUID(),
      name: name ?? `Track ${trackCounter}`,
      color: "#22d3ee",
      presetId,
    };
    set((s) => ({ tracks: [...s.tracks, track] }));
  },
  removeTrack: (id: string) => {
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },
  renameTrack: (id: string, name: string) => {
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, name } : t)),
    }));
  },
  selectTrack: (id: string | null) => {
    set({ selectedId: id });
  },
  setTrackColor: (id: string, color: string) => {
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, color } : t)),
    }));
  },
  setTrackPreset: (id: string, presetId: string) => {
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, presetId } : t)),
    }));
  },
  reorderTracks: (fromIndex: number, toIndex: number) => {
    set((s) => {
      const tracks = [...s.tracks];
      const [moved] = tracks.splice(fromIndex, 1);
      tracks.splice(toIndex, 0, moved);
      return { tracks };
    });
  },
  clearTracks: () => {
    set({ tracks: [], selectedId: null });
  },
}));
