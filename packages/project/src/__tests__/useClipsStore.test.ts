import { describe, it, expect, beforeEach } from "vitest";
import { useClipsStore } from "../useClipsStore";

beforeEach(() => {
  useClipsStore.setState({ clips: [], nextId: 1, version: 0 });
});

describe("useClipsStore", () => {
  // ── Happy path clips ──

  it("FEAT-051-01: addClip agrega clip con ID auto-generado y notes vacio", () => {
    const id = useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip 1",
    });
    const clips = useClipsStore.getState().clips;
    expect(clips).toHaveLength(1);
    expect(clips[0].id).toBe(1);
    expect(clips[0].notes).toEqual([]);
    expect(id).toBe(1);
  });

  it("FEAT-051-02: addClip con externalId usa ese ID", () => {
    const id = useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip 1",
    }, 42);
    expect(useClipsStore.getState().clips[0].id).toBe(42);
    expect(id).toBe(42);
  });

  it("FEAT-051-03: moveClip cambia startTick y trackIndex", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip 1",
    });
    useClipsStore.getState().moveClip(1, 192, 2);
    const clip = useClipsStore.getState().clips[0];
    expect(clip.startTick).toBe(192);
    expect(clip.trackIndex).toBe(2);
  });

  it("FEAT-051-04: resizeClip cambia startTick y durationTicks", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip 1",
    });
    useClipsStore.getState().resizeClip(1, 48, 192);
    const clip = useClipsStore.getState().clips[0];
    expect(clip.startTick).toBe(48);
    expect(clip.durationTicks).toBe(192);
  });

  it("FEAT-051-05: removeClip elimina clip por ID", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip 1",
    });
    useClipsStore.getState().removeClip(1);
    expect(useClipsStore.getState().clips).toHaveLength(0);
  });

  it("FEAT-051-06: setClipNotes reemplaza notas de un clip", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip 1",
    });
    const notes = [
      { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
      { id: 2, note: 64, startTick: 24, durationTicks: 24, velocity: 80 },
    ];
    useClipsStore.getState().setClipNotes(1, notes);
    expect(useClipsStore.getState().clips[0].notes).toHaveLength(2);
    expect(useClipsStore.getState().clips[0].notes[0].note).toBe(60);
  });

  it("FEAT-051-07: setClips reemplaza todos los clips e incrementa version", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip 1",
    });
    const v0 = useClipsStore.getState().version;
    useClipsStore.getState().setClips([
      { id: 10, trackId: "t2", trackIndex: 1, startTick: 0, durationTicks: 48, color: "#ef4444", name: "New", notes: [] },
    ]);
    const s = useClipsStore.getState();
    expect(s.clips).toHaveLength(1);
    expect(s.clips[0].id).toBe(10);
    expect(s.version).toBe(v0 + 1);
  });

  it("FEAT-051-08: getClipsForTrack retorna solo clips del track especificado", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip A",
    });
    useClipsStore.getState().addClip({
      trackId: "t2", trackIndex: 1, startTick: 0, durationTicks: 96,
      color: "#ef4444", name: "Clip B",
    });
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 96, durationTicks: 48,
      color: "#22d3ee", name: "Clip C",
    });
    const track0 = useClipsStore.getState().getClipsForTrack(0);
    expect(track0).toHaveLength(2);
    expect(track0.every((c) => c.trackIndex === 0)).toBe(true);
  });

  // ── Edge cases ──

  it("FEAT-051-16: addClip a track inexistente se agrega con trackIndex dado", () => {
    useClipsStore.getState().addClip({
      trackId: "t99", trackIndex: 99, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip",
    });
    expect(useClipsStore.getState().clips[0].trackIndex).toBe(99);
  });

  it("FEAT-051-17: moveClip con ID inexistente es no-op", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip",
    });
    useClipsStore.getState().moveClip(999, 100, 5);
    expect(useClipsStore.getState().clips[0].startTick).toBe(0);
    expect(useClipsStore.getState().clips[0].trackIndex).toBe(0);
  });

  it("FEAT-051-18: resizeClip con durationTicks negativo se permite", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip",
    });
    useClipsStore.getState().resizeClip(1, 0, -10);
    expect(useClipsStore.getState().clips[0].durationTicks).toBe(-10);
  });

  it("FEAT-051-21: setClips con array vacio resetea clips y version", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip",
    });
    useClipsStore.getState().setClips([]);
    const s = useClipsStore.getState();
    expect(s.clips).toEqual([]);
    expect(s.version).toBe(1);
  });

  // ── IDs auto-incrementados ──

  it("nextId incrementa correctamente con addClip", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "A",
    });
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 96, durationTicks: 96,
      color: "#22d3ee", name: "B",
    });
    expect(useClipsStore.getState().clips[0].id).toBe(1);
    expect(useClipsStore.getState().clips[1].id).toBe(2);
    expect(useClipsStore.getState().nextId).toBe(3);
  });

  it("addClip con externalId alto ajusta nextId", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "A",
    }, 50);
    expect(useClipsStore.getState().nextId).toBe(51);
    const id = useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "B",
    });
    expect(id).toBe(51);
  });

  // ── moveClip con trackId ──

  it("moveClip con trackId actualiza trackId del clip", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip",
    });
    useClipsStore.getState().moveClip(1, 0, 1, "t2");
    expect(useClipsStore.getState().clips[0].trackId).toBe("t2");
    expect(useClipsStore.getState().clips[0].trackIndex).toBe(1);
  });

  it("moveClip sin trackId no cambia trackId original", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip",
    });
    useClipsStore.getState().moveClip(1, 100, 2);
    expect(useClipsStore.getState().clips[0].trackId).toBe("t1");
  });
});
