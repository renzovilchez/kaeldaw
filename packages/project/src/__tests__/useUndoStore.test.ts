import { describe, it, expect, beforeEach } from "vitest";
import { useUndoStore } from "../useUndoStore";
import { useTracksStore } from "../useTracksStore";
import { useMixerStore } from "../useMixerStore";
import { useClipsStore } from "../useClipsStore";
import { useMidiStore } from "../useMidiStore";

beforeEach(() => {
  useTracksStore.setState({ tracks: [], selectedId: null });
  useMixerStore.setState({ channels: [], masterVolume: 1, masterMeterLevel: 0 });
  useClipsStore.setState({ clips: [], nextId: 1, version: 0 });
  useMidiStore.setState({ clipId: null, notes: [], nextId: 1 });
  useUndoStore.getState().clearHistory();
});

describe("useUndoStore", () => {
  // ── Happy path ──

  it("FEAT-052-02: Estado inicial canUndo=false, canRedo=false", () => {
    const s = useUndoStore.getState();
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
  });

  it("FEAT-052-03: executeAction actualiza canUndo a true", () => {
    useUndoStore.getState().executeAction("test", () => {
      useTracksStore.getState().addTrack("A");
    });
    expect(useUndoStore.getState().canUndo).toBe(true);
  });

  it("FEAT-052-04: executeAction limpia redo stack", () => {
    useUndoStore.getState().executeAction("a", () => {
      useTracksStore.getState().addTrack("A");
    });
    useUndoStore.getState().undo();
    expect(useUndoStore.getState().canRedo).toBe(true);
    useUndoStore.getState().executeAction("b", () => {
      useTracksStore.getState().addTrack("B");
    });
    expect(useUndoStore.getState().canRedo).toBe(false);
  });

  it("FEAT-052-05: undo() restaura estado before, canRedo=true", () => {
    useUndoStore.getState().executeAction("add track", () => {
      useTracksStore.getState().addTrack("A");
    });
    expect(useTracksStore.getState().tracks).toHaveLength(1);
    useUndoStore.getState().undo();
    expect(useTracksStore.getState().tracks).toHaveLength(0);
    expect(useUndoStore.getState().canRedo).toBe(true);
  });

  it("FEAT-052-06: redo() restaura estado after, canUndo=true", () => {
    useUndoStore.getState().executeAction("add track", () => {
      useTracksStore.getState().addTrack("A");
    });
    useUndoStore.getState().undo();
    useUndoStore.getState().redo();
    expect(useTracksStore.getState().tracks).toHaveLength(1);
    expect(useUndoStore.getState().canUndo).toBe(true);
  });

  it("FEAT-052-07: undo() sin historial no cambia estado", () => {
    useUndoStore.getState().undo();
    expect(useUndoStore.getState().canUndo).toBe(false);
    expect(useUndoStore.getState().canRedo).toBe(false);
  });

  it("FEAT-052-08: redo() sin historial no cambia estado", () => {
    useUndoStore.getState().redo();
    expect(useUndoStore.getState().canUndo).toBe(false);
    expect(useUndoStore.getState().canRedo).toBe(false);
  });

  // ── Cadena de acciones ──

  it("FEAT-052-09: Dos executeActions + undo = deshace la segunda", () => {
    useUndoStore.getState().executeAction("add A", () => {
      useTracksStore.getState().addTrack("A");
    });
    useUndoStore.getState().executeAction("add B", () => {
      useTracksStore.getState().addTrack("B");
    });
    expect(useTracksStore.getState().tracks).toHaveLength(2);
    useUndoStore.getState().undo();
    expect(useTracksStore.getState().tracks).toHaveLength(1);
    expect(useTracksStore.getState().tracks[0].name).toBe("A");
  });

  it("FEAT-052-10: Dos executeActions + undo + redo = restaura la segunda", () => {
    useUndoStore.getState().executeAction("add A", () => {
      useTracksStore.getState().addTrack("A");
    });
    useUndoStore.getState().executeAction("add B", () => {
      useTracksStore.getState().addTrack("B");
    });
    useUndoStore.getState().undo();
    useUndoStore.getState().redo();
    expect(useTracksStore.getState().tracks).toHaveLength(2);
  });

  it("FEAT-052-11: Tres executeActions + undo + undo + redo = estado intermedio", () => {
    useUndoStore.getState().executeAction("add A", () => {
      useTracksStore.getState().addTrack("A");
    });
    useUndoStore.getState().executeAction("add B", () => {
      useTracksStore.getState().addTrack("B");
    });
    useUndoStore.getState().executeAction("add C", () => {
      useTracksStore.getState().addTrack("C");
    });
    useUndoStore.getState().undo();
    useUndoStore.getState().undo();
    expect(useTracksStore.getState().tracks).toHaveLength(1);
    useUndoStore.getState().redo();
    expect(useTracksStore.getState().tracks).toHaveLength(2);
  });

  // ── Snapshot de stores ──

  it("FEAT-052-12: executeAction captura tracks vacio → tracks con 1 track", () => {
    useUndoStore.getState().executeAction("add track", () => {
      useTracksStore.getState().addTrack("A");
    });
    expect(useTracksStore.getState().tracks).toHaveLength(1);
    expect(useTracksStore.getState().tracks[0].name).toBe("A");
  });

  it("FEAT-052-13: undo() restaura tracks a vacio", () => {
    useUndoStore.getState().executeAction("add track", () => {
      useTracksStore.getState().addTrack("A");
    });
    useUndoStore.getState().undo();
    expect(useTracksStore.getState().tracks).toHaveLength(0);
  });

  it("FEAT-052-14: executeAction captura masterVolume=1 → masterVolume=0.3", () => {
    useUndoStore.getState().executeAction("set volume", () => {
      useMixerStore.getState().setMasterVolume(0.3);
    });
    expect(useMixerStore.getState().masterVolume).toBe(0.3);
  });

  it("FEAT-052-15: undo() restaura masterVolume a 1", () => {
    useUndoStore.getState().executeAction("set volume", () => {
      useMixerStore.getState().setMasterVolume(0.3);
    });
    useUndoStore.getState().undo();
    expect(useMixerStore.getState().masterVolume).toBe(1);
  });

  // ── Max history ──

  it("FEAT-052-16: 51 executeActions no crashea", () => {
    for (let i = 0; i < 51; i++) {
      useUndoStore.getState().executeAction(`action ${i}`, () => {
        useTracksStore.getState().addTrack(`Track ${i}`);
      });
    }
    expect(useTracksStore.getState().tracks).toHaveLength(51);
    expect(useUndoStore.getState().canUndo).toBe(true);
  });

  // ── Redo se pierde ──

  it("FEAT-052-18: undo() + executeAction nuevo → redo se pierde", () => {
    useUndoStore.getState().executeAction("add A", () => {
      useTracksStore.getState().addTrack("A");
    });
    useUndoStore.getState().undo();
    expect(useUndoStore.getState().canRedo).toBe(true);
    useUndoStore.getState().executeAction("add B", () => {
      useTracksStore.getState().addTrack("B");
    });
    expect(useUndoStore.getState().canRedo).toBe(false);
  });

  // ── Clips en snapshot ──

  it("executeAction con clips se restaura correctamente", () => {
    useUndoStore.getState().executeAction("add clip", () => {
      useClipsStore.getState().addClip({
        trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
        color: "#22d3ee", name: "Clip",
      });
    });
    expect(useClipsStore.getState().clips).toHaveLength(1);
    useUndoStore.getState().undo();
    expect(useClipsStore.getState().clips).toHaveLength(0);
  });

  it("executeAction con mixer channels se restaura correctamente", () => {
    useUndoStore.getState().executeAction("add channel", () => {
      useMixerStore.getState().addChannel("Kick", "t1");
    });
    expect(useMixerStore.getState().channels).toHaveLength(1);
    useUndoStore.getState().undo();
    expect(useMixerStore.getState().channels).toHaveLength(0);
  });
});
