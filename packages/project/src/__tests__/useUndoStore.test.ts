import { describe, it, expect, beforeEach } from "vitest";
import { useUndoStore } from "../useUndoStore";
import { useTracksStore } from "../useTracksStore";
import { useMixerStore } from "../useMixerStore";
import { useClipsStore } from "../useClipsStore";
import { useMidiStore } from "../useMidiStore";

const CTX = "tracks";

beforeEach(() => {
  useTracksStore.setState({ tracks: [], selectedId: null });
  useMixerStore.setState({ channels: [], masterVolume: 1, masterMeterLevel: 0 });
  useClipsStore.setState({ clips: [], nextId: 1, version: 0 });
  useMidiStore.setState({ clipId: null, notes: [], nextId: 1 });
  useUndoStore.getState().clearHistory();
  useUndoStore.getState().setFocusedContext(CTX);
});

function canUndo() { return useUndoStore.getState().canUndo[CTX]; }
function canRedo() { return useUndoStore.getState().canRedo[CTX]; }
function exec(getSnapshot: () => { tracks: { id: string; name: string }[] }) {
  useUndoStore.getState().executeAction(CTX, getSnapshot);
}

describe("useUndoStore", () => {
  it("Estado inicial canUndo=false, canRedo=false", () => {
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it("executeAction actualiza canUndo a true", () => {
    exec(() => ({ tracks: [] }));
    expect(canUndo()).toBe(true);
  });

  it("executeAction limpia redo stack", () => {
    exec(() => ({ tracks: [{ id: "1", name: "A" }] }));
    expect(useUndoStore.getState().undo(CTX, () => ({ tracks: [{ id: "1", name: "A" }] }))).toBeTruthy();
    expect(canRedo()).toBe(true);
    exec(() => ({ tracks: [{ id: "2", name: "B" }] }));
    expect(canRedo()).toBe(false);
  });

  it("undo() restaura estado anterior via snapshot", () => {
    exec(() => ({ tracks: [] }));
    useTracksStore.getState().addTrack("A");
    const snap = useUndoStore.getState().undo(CTX, () => ({
      tracks: useTracksStore.getState().tracks.map((t) => ({ id: t.id, name: t.name })),
    }));
    expect(snap).toBeTruthy();
    const s = snap as { tracks: { id: string; name: string }[] };
    expect(s.tracks).toHaveLength(0);
    expect(canRedo()).toBe(true);
  });

  it("undo + redo restaura estado", () => {
    exec(() => ({ tracks: [] }));
    useTracksStore.getState().addTrack("A");
    const snap1 = useUndoStore.getState().undo(CTX, () => ({
      tracks: useTracksStore.getState().tracks.map((t) => ({ id: t.id, name: t.name })),
    }));
    const s1 = snap1 as { tracks: { id: string; name: string }[] };
    expect(s1.tracks).toHaveLength(0);
    const snap2 = useUndoStore.getState().redo(CTX, () => ({
      tracks: useTracksStore.getState().tracks.map((t) => ({ id: t.id, name: t.name })),
    }));
    const s2 = snap2 as { tracks: { id: string; name: string }[] };
    expect(s2.tracks).toHaveLength(1);
    expect(canUndo()).toBe(true);
  });

  it("undo sin historial devuelve null", () => {
    expect(useUndoStore.getState().undo(CTX, () => ({}))).toBeNull();
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it("redo sin historial devuelve null", () => {
    expect(useUndoStore.getState().redo(CTX, () => ({}))).toBeNull();
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it("Dos executeActions + undo deshace la segunda", () => {
    exec(() => ({ tracks: [] }));
    useTracksStore.getState().addTrack("A");
    exec(() => ({ tracks: [{ id: "1", name: "A" }] }));
    useTracksStore.getState().addTrack("B");
    expect(useTracksStore.getState().tracks).toHaveLength(2);
    const snap = useUndoStore.getState().undo(CTX, () => ({
      tracks: useTracksStore.getState().tracks.map((t) => ({ id: t.id, name: t.name })),
    }));
    expect(snap).toBeTruthy();
    const s = snap as { tracks: { id: string; name: string }[] };
    expect(s.tracks).toHaveLength(1);
    expect(s.tracks[0].name).toBe("A");
  });

  it("Dos executeActions + undo + redo restaura la segunda", () => {
    exec(() => ({ tracks: [] }));
    useTracksStore.getState().addTrack("A");
    exec(() => ({ tracks: [{ id: "1", name: "A" }] }));
    useTracksStore.getState().addTrack("B");
    useUndoStore.getState().undo(CTX, () => ({
      tracks: useTracksStore.getState().tracks.map((t) => ({ id: t.id, name: t.name })),
    }));
    const snap = useUndoStore.getState().redo(CTX, () => ({
      tracks: useTracksStore.getState().tracks.map((t) => ({ id: t.id, name: t.name })),
    }));
    const s = snap as { tracks: { id: string; name: string }[] };
    expect(s.tracks).toHaveLength(2);
  });

  it("redo sin undo previo no hace nada", () => {
    expect(useUndoStore.getState().redo(CTX, () => ({}))).toBeNull();
  });

  it("Pila maxima 50", () => {
    for (let i = 0; i < 55; i++) {
      exec(() => ({ tracks: [{ id: String(i), name: `Track ${i}` }] }));
    }
    // verify oldest was pushed out (only 50 remain)
    let count = 0;
    while (true) {
      const snap = useUndoStore.getState().undo(CTX, () => ({ tracks: [] }));
      if (!snap) break;
      count++;
    }
    expect(count).toBe(50);
  });

  it("undo + executeAction nuevo → redo se pierde", () => {
    exec(() => ({ tracks: [] }));
    useTracksStore.getState().addTrack("A");
    useUndoStore.getState().undo(CTX, () => ({
      tracks: useTracksStore.getState().tracks.map((t) => ({ id: t.id, name: t.name })),
    }));
    expect(canRedo()).toBe(true);
    exec(() => ({ tracks: [{ id: "1", name: "A" }] }));
    expect(canRedo()).toBe(false);
  });

  it("contextos separados no interfieren", () => {
    exec(() => ({ tracks: [] }));
    useTracksStore.getState().addTrack("A");
    useUndoStore.getState().executeAction("mixer", () => ({
      channels: useMixerStore.getState().channels,
      masterVolume: useMixerStore.getState().masterVolume,
    }));
    useMixerStore.getState().setMasterVolume(0.5);
    useUndoStore.getState().setFocusedContext("mixer");
    expect(useUndoStore.getState().canUndo.mixer).toBe(true);
    const snap = useUndoStore.getState().undo("mixer", () => ({
      channels: useMixerStore.getState().channels.map((c) => ({ ...c })),
      masterVolume: useMixerStore.getState().masterVolume,
    }));
    const s = snap as { masterVolume: number };
    expect(s.masterVolume).toBe(1);
    useUndoStore.getState().setFocusedContext(CTX);
    expect(canUndo()).toBe(true);
  });
});
