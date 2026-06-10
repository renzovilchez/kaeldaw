import { describe, it, expect, beforeEach } from "vitest";
import { useMidiStore } from "../useMidiStore";
import { useClipsStore } from "../useClipsStore";

beforeEach(() => {
  useClipsStore.setState({ clips: [], nextId: 1, version: 0 });
  useMidiStore.setState({ clipId: null, notes: [], nextId: 1 });
});

describe("useMidiStore", () => {
  // ── Happy path MIDI notes ──

  it("FEAT-051-09: loadForClip establece clipId y carga notas", () => {
    const notes = [
      { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
    ];
    useMidiStore.getState().loadForClip(42, notes);
    const s = useMidiStore.getState();
    expect(s.clipId).toBe(42);
    expect(s.notes).toHaveLength(1);
    expect(s.notes[0].note).toBe(60);
  });

  it("FEAT-051-10: clear resetea clipId a null y notas a vacio", () => {
    useMidiStore.getState().loadForClip(1, [
      { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
    ]);
    useMidiStore.getState().clear();
    const s = useMidiStore.getState();
    expect(s.clipId).toBeNull();
    expect(s.notes).toEqual([]);
    expect(s.nextId).toBe(1);
  });

  it("FEAT-051-11: addNote agrega nota al clip activo con ID auto-generado", () => {
    useMidiStore.getState().loadForClip(1, []);
    const id = useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    });
    expect(useMidiStore.getState().notes).toHaveLength(1);
    expect(useMidiStore.getState().notes[0].id).toBe(1);
    expect(id).toBe(1);
  });

  it("FEAT-051-12: moveNote cambia pitch y startTick", () => {
    useMidiStore.getState().loadForClip(1, []);
    useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    });
    useMidiStore.getState().moveNote(1, 67, 48);
    const n = useMidiStore.getState().notes[0];
    expect(n.note).toBe(67);
    expect(n.startTick).toBe(48);
  });

  it("FEAT-051-13: resizeNote cambia startTick y durationTicks", () => {
    useMidiStore.getState().loadForClip(1, []);
    useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    });
    useMidiStore.getState().resizeNote(1, 12, 48);
    const n = useMidiStore.getState().notes[0];
    expect(n.startTick).toBe(12);
    expect(n.durationTicks).toBe(48);
  });

  it("FEAT-051-14: removeNote elimina nota por ID", () => {
    useMidiStore.getState().loadForClip(1, []);
    useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    });
    useMidiStore.getState().removeNote(1);
    expect(useMidiStore.getState().notes).toHaveLength(0);
  });

  it("FEAT-051-15: syncToClips copia notas del MidiStore al clip en ClipsStore", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip",
    });
    useMidiStore.getState().loadForClip(1, []);
    useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    });
    useMidiStore.getState().addNote({
      note: 64, startTick: 24, durationTicks: 24, velocity: 80,
    });
    useMidiStore.getState().syncToClips();
    const clipNotes = useClipsStore.getState().clips[0].notes;
    expect(clipNotes).toHaveLength(2);
    expect(clipNotes[0].note).toBe(60);
    expect(clipNotes[1].note).toBe(64);
  });

  // ── Edge cases ──

  it("FEAT-051-19: syncToClips sin clipId activo es no-op", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip",
    });
    useMidiStore.getState().syncToClips();
    expect(useClipsStore.getState().clips[0].notes).toEqual([]);
  });

  it("FEAT-051-20: addNote con externalId ajusta nextId correctamente", () => {
    useMidiStore.getState().loadForClip(1, []);
    useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    }, 10);
    expect(useMidiStore.getState().nextId).toBe(11);
    const id = useMidiStore.getState().addNote({
      note: 64, startTick: 0, durationTicks: 24, velocity: 80,
    });
    expect(id).toBe(11);
  });

  // ── loadForClip reemplaza notas previas ──

  it("loadForClip con notas existentes las reemplaza", () => {
    useMidiStore.getState().loadForClip(1, [
      { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
    ]);
    useMidiStore.getState().loadForClip(2, [
      { id: 1, note: 72, startTick: 0, durationTicks: 48, velocity: 90 },
      { id: 2, note: 74, startTick: 48, durationTicks: 48, velocity: 70 },
    ]);
    const s = useMidiStore.getState();
    expect(s.clipId).toBe(2);
    expect(s.notes).toHaveLength(2);
    expect(s.notes[0].note).toBe(72);
  });

  // ── addNote con externalId ──

  it("addNote con externalId usa ese ID", () => {
    useMidiStore.getState().loadForClip(1, []);
    const id = useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    }, 42);
    expect(useMidiStore.getState().notes[0].id).toBe(42);
    expect(id).toBe(42);
  });

  // ── moveNote y resizeNote con ID inexistente ──

  it("moveNote con ID inexistente es no-op", () => {
    useMidiStore.getState().loadForClip(1, []);
    useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    });
    useMidiStore.getState().moveNote(999, 72, 100);
    expect(useMidiStore.getState().notes[0].note).toBe(60);
    expect(useMidiStore.getState().notes[0].startTick).toBe(0);
  });

  it("resizeNote con ID inexistente es no-op", () => {
    useMidiStore.getState().loadForClip(1, []);
    useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    });
    useMidiStore.getState().resizeNote(999, 10, 50);
    expect(useMidiStore.getState().notes[0].startTick).toBe(0);
    expect(useMidiStore.getState().notes[0].durationTicks).toBe(24);
  });

  // ── removeNote con ID inexistente ──

  it("removeNote con ID inexistente no cambia el estado", () => {
    useMidiStore.getState().loadForClip(1, []);
    useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    });
    useMidiStore.getState().removeNote(999);
    expect(useMidiStore.getState().notes).toHaveLength(1);
  });

  // ── syncToClips preserva order ──

  it("syncToClips preserva el orden de notas", () => {
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip",
    });
    useMidiStore.getState().loadForClip(1, []);
    useMidiStore.getState().addNote({
      note: 72, startTick: 48, durationTicks: 24, velocity: 90,
    });
    useMidiStore.getState().addNote({
      note: 60, startTick: 0, durationTicks: 24, velocity: 100,
    });
    useMidiStore.getState().syncToClips();
    const notes = useClipsStore.getState().clips[0].notes;
    expect(notes[0].startTick).toBe(48);
    expect(notes[1].startTick).toBe(0);
  });
});
