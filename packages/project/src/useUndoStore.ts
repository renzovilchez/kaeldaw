import { create } from "zustand";
import { UndoRedoManager, type Command } from "./CommandHistory";
import { useTracksStore } from "./useTracksStore";
import { useMixerStore } from "./useMixerStore";
import { useClipsStore } from "./useClipsStore";
import { useMidiStore } from "./useMidiStore";

interface ProjectSnapshot {
  tracks: { id: string; name: string }[];
  channels: { id: string; name: string; volume: number; pan: number; mute: boolean; solo: boolean; meterLevel: number }[];
  masterVolume: number;
  clips: { id: number; trackIndex: number; trackId: string; startTick: number; durationTicks: number; color: string; name: string; notes: { id: number; note: number; startTick: number; durationTicks: number; velocity: number; color?: string }[] }[];
}

function takeSnapshot(): ProjectSnapshot {
  return {
    tracks: useTracksStore.getState().tracks.map((t) => ({ id: t.id, name: t.name })),
    channels: useMixerStore.getState().channels.map((ch) => ({
      id: ch.id, name: ch.name, volume: ch.volume, pan: ch.pan, mute: ch.mute, solo: ch.solo, meterLevel: ch.meterLevel,
    })),
    masterVolume: useMixerStore.getState().masterVolume,
    clips: useClipsStore.getState().clips.map((c) => ({
      id: c.id, trackIndex: c.trackIndex, trackId: c.trackId,
      startTick: c.startTick, durationTicks: c.durationTicks, color: c.color, name: c.name,
      notes: c.notes.map((n) => ({ ...n })),
    })),
  };
}

function restoreSnapshot(snap: ProjectSnapshot): void {
  useTracksStore.setState({ tracks: snap.tracks, selectedId: useTracksStore.getState().selectedId });
  useMixerStore.setState({ channels: snap.channels, masterVolume: snap.masterVolume });
  useClipsStore.getState().setClips(snap.clips);
  useMidiStore.getState().clear();
}

class SnapshotCommand implements Command {
  readonly name: string;
  #before: ProjectSnapshot;
  #after: ProjectSnapshot;

  constructor(name: string, before: ProjectSnapshot, after: ProjectSnapshot) {
    this.name = name;
    this.#before = before;
    this.#after = after;
  }

  execute(): void { restoreSnapshot(this.#after); }
  undo(): void { restoreSnapshot(this.#before); }
}

export interface UndoStore {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  executeAction: (name: string, action: () => void) => void;
  clearHistory: () => void;
}

const manager = new UndoRedoManager(50);

export const useUndoStore = create<UndoStore>((set) => ({
  canUndo: false,
  canRedo: false,

  undo: () => {
    if (manager.undo()) {
      set({ canUndo: manager.canUndo, canRedo: manager.canRedo });
    }
  },

  redo: () => {
    if (manager.redo()) {
      set({ canUndo: manager.canUndo, canRedo: manager.canRedo });
    }
  },

  executeAction: (name, action) => {
    const before = takeSnapshot();
    action();
    const after = takeSnapshot();
    manager.execute(new SnapshotCommand(name, before, after));
    set({ canUndo: manager.canUndo, canRedo: manager.canRedo });
  },

  clearHistory: () => {
    manager.clear();
    set({ canUndo: false, canRedo: false });
  },
}));
