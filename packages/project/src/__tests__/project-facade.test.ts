import { describe, it, expect } from "vitest";
import { Project } from "../core/project";

describe("Project facade POO", () => {
  it("create() arranca con estado por defecto", () => {
    const project = Project.create();
    expect(project.name).toBe("Untitled");
    expect(project.bpm).toBe(120);
    expect(project.tracks).toHaveLength(0);
  });

  it("addTrack devuelve el id del track creado", () => {
    const project = Project.create();
    const id = project.addTrack("Bass");
    expect(id).toBeTypeOf("string");
    expect(project.tracks).toHaveLength(1);
    expect(project.tracks[0].name).toBe("Bass");
  });

  it("setTempo y undo/redo funcionan sobre el mismo objeto", () => {
    const project = Project.create();
    project.setTempo(140);
    expect(project.bpm).toBe(140);
    project.undo();
    expect(project.bpm).toBe(120);
    project.redo();
    expect(project.bpm).toBe(140);
  });

  it("addClip + moveClip + addNote devuelven ids", () => {
    const project = Project.create();
    const trackId = project.addTrack("Lead");
    const clipId = project.addClip({
      trackId,
      trackIndex: 0,
      startTick: 0,
      durationTicks: 1920,
      color: "#22d3ee",
      name: "Loop",
    });
    project.moveClip(clipId, 480, 1);
    expect(project.clips[0].startTick).toBe(480);
    const noteId = project.addNote(clipId, {
      note: 60,
      startTick: 0,
      durationTicks: 96,
      velocity: 100,
    });
    expect(noteId).toBeGreaterThan(0);
    expect(project.clips[0].notes).toHaveLength(1);
  });

  it("transport play/stop solo muta estado", () => {
    const project = Project.create();
    project.play();
    expect(project.transport.state).toBe("playing");
    project.stop();
    expect(project.transport.state).toBe("stopped");
  });

  it("subscribe notifica al cambiar nombre", () => {
    const project = Project.create();
    const seen: string[] = [];
    project.subscribe((s) => seen.push(s.name));
    project.setName("Demo");
    expect(seen).toContain("Demo");
  });

  it("serialize/deserialize round-trip headless", () => {
    const project = Project.create();
    const trackId = project.addTrack("Drums");
    project.addClip({
      trackId,
      trackIndex: 0,
      startTick: 0,
      durationTicks: 96,
      color: "#22d3ee",
      name: "Hit",
    });
    const json = project.serialize();

    const restored = Project.create();
    restored.deserialize(json);
    expect(restored.tracks).toHaveLength(1);
    expect(restored.tracks[0].name).toBe("Drums");
    expect(restored.clips).toHaveLength(1);
  });

  it("fromSchema restaura y limpia historial", () => {
    const project = Project.create();
    project.setTempo(150);
    const schema = project.toSchema();
    project.setTempo(90);
    expect(project.canUndo).toBe(true);
    project.fromSchema(schema);
    expect(project.bpm).toBe(150);
    expect(project.canUndo).toBe(false);
  });

  it("mixer via facade", () => {
    const project = Project.create();
    project.addChannel({ id: "ch-1", name: "Kick", volume: 0.7 });
    project.setChannelVolume("ch-1", 1);
    project.setChannelPan("ch-1", 0.5);
    project.setMasterVolume(0.9);
    expect(project.channels[0].volume).toBe(1);
    expect(project.channels[0].pan).toBe(0.5);
    expect(project.masterVolume).toBe(0.9);
  });
});
