import { describe, it, expect } from "vitest";
import { serialize, deserialize } from "../schema";
import {
  createProject,
  addTrack,
  removeTrack,
  renameTrack,
  setTrackColor,
  addClip,
  moveClip,
  resizeClip,
  trimClip,
  removeClip,
  setClipNotes,
  addNote,
  removeNote,
  updateNote,
  setTempo,
  setTimeSignature,
  setName,
  addMixerChannel,
  setChannelVolume,
  setChannelPan,
  setChannelMute,
  setChannelSolo,
  setChannelInsertFx,
  setChannelSend,
  addMixerBus,
  setBusVolume,
  setMasterVolume,
  play,
  pause,
  stop,
  setPosition,
  toggleMetronome,
  createCoreStore,
  toSchema,
  fromSchema,
} from "../core";

describe("core headless", () => {
  it("edicion de tracks y clips (rename/resize/trim/remove/setNotes/ts)", () => {
    let project = createProject();
    project = addTrack(project, "A");
    project = addTrack(project, "B");
    project = renameTrack(project, project.tracks[0].id, "Renamed");
    expect(project.tracks[0].name).toBe("Renamed");
    project = setTimeSignature(project, { beats: 3, beatValue: 4 });
    expect(project.timeSignature).toEqual({ beats: 3, beatValue: 4 });

    project = addClip(project, {
      trackId: project.tracks[0].id,
      trackIndex: 0,
      startTick: 0,
      durationTicks: 96,
      color: "#22d3ee",
      name: "C",
    });
    const clipId = project.clips[0].id;
    project = resizeClip(project, clipId, 48, 192);
    expect(project.clips[0]).toMatchObject({ startTick: 48, durationTicks: 192 });
    project = trimClip(project, clipId, 24, 120);
    expect(project.clips[0]).toMatchObject({ startOffset: 24, durationTicks: 120 });
    const note = { id: 1, note: 62, startTick: 0, durationTicks: 24, velocity: 90 };
    project = setClipNotes(project, clipId, [note]);
    expect(project.clips[0].notes).toHaveLength(1);
    project = removeClip(project, clipId);
    expect(project.clips).toHaveLength(0);
    project = removeTrack(project, project.tracks[0].id);
    expect(project.tracks).toHaveLength(1);
  });

  it("createProject devuelve un estado valido sin navegador", () => {
    const project = createProject();
    expect(project.name).toBe("Untitled");
    expect(project.bpm).toBe(120);
    expect(project.ppqn).toBe(960);
    expect(project.timeSignature).toEqual({ beats: 4, beatValue: 4 });
    expect(project.tracks).toHaveLength(0);
    expect(project.clips).toHaveLength(0);
  });

  it("crear proyecto, track y clip es un flujo puro", () => {
    let project = createProject();
    project = addTrack(project, "Drums");
    const track = project.tracks[0];
    project = addClip(project, {
      trackId: track.id,
      trackIndex: 0,
      startTick: 0,
      durationTicks: 1920,
      color: "#22d3ee",
      name: "Beat",
    });
    expect(project.tracks).toHaveLength(1);
    expect(project.clips).toHaveLength(1);
    expect(project.clips[0].trackId).toBe(track.id);
  });

  it("setTempo clampa entre 20 y 300", () => {
    let project = createProject();
    project = setTempo(project, 140);
    expect(project.bpm).toBe(140);
    project = setTempo(project, 10);
    expect(project.bpm).toBe(20);
    project = setTempo(project, 400);
    expect(project.bpm).toBe(300);
  });

  it("moveClip cambia startTick y trackIndex", () => {
    let project = createProject();
    project = addTrack(project);
    project = addTrack(project);
    project = addClip(project, {
      trackId: project.tracks[0].id,
      trackIndex: 0,
      startTick: 0,
      durationTicks: 96,
      color: "#22d3ee",
      name: "C1",
    });
    const clipId = project.clips[0].id;
    project = moveClip(project, clipId, 1920, 1, project.tracks[1].id);
    expect(project.clips[0].startTick).toBe(1920);
    expect(project.clips[0].trackIndex).toBe(1);
    expect(project.clips[0].trackId).toBe(project.tracks[1].id);
  });

  it("addNote/removeNote/updateNote sobre un clip", () => {
    let project = createProject();
    project = addTrack(project);
    project = addClip(project, {
      trackId: project.tracks[0].id,
      trackIndex: 0,
      startTick: 0,
      durationTicks: 1920,
      color: "#22d3ee",
      name: "Melody",
    });
    const clipId = project.clips[0].id;
    project = addNote(project, clipId, { note: 60, startTick: 0, durationTicks: 96, velocity: 100 });
    const noteId = project.clips[0].notes[0].id;
    project = addNote(project, clipId, { note: 64, startTick: 96, durationTicks: 96, velocity: 90 });
    expect(project.clips[0].notes).toHaveLength(2);
    project = updateNote(project, clipId, noteId, { note: 67, velocity: 127 });
    const updated = project.clips[0].notes.find((n) => n.id === noteId);
    expect(updated).toMatchObject({ note: 67, velocity: 127 });
    project = removeNote(project, clipId, noteId);
    expect(project.clips[0].notes).toHaveLength(1);
  });

  it("mixer channels, buses y master", () => {
    let project = createProject();
    project = addMixerChannel(project, { id: "ch-1", name: "Kick", volume: 0.7, pan: -0.3 });
    project = setChannelVolume(project, "ch-1", 1);
    project = setChannelPan(project, "ch-1", 0.5);
    project = setChannelMute(project, "ch-1", true);
    project = setChannelSolo(project, "ch-1", true);
    project = setChannelInsertFx(project, "ch-1", "delay", true, 0.3);
    project = setChannelSend(project, "ch-1", "reverb-bus", 0.4);
    project = addMixerBus(project, { id: "reverb-bus", name: "Reverb" });
    project = setBusVolume(project, "reverb-bus", 0.9);
    project = setMasterVolume(project, 1);
    const ch = project.mixer.channels[0];
    expect(ch).toMatchObject({ volume: 1, pan: 0.5, mute: true, solo: true });
    expect(ch.insertFx[0]).toMatchObject({ type: "delay", enabled: true });
    expect(ch.sends).toEqual([{ busId: "reverb-bus", level: 0.4 }]);
    expect(project.mixer.buses[0].volume).toBe(0.9);
    expect(project.mixer.masterVolume).toBe(1);
  });

  it("transport play/pause/stop/position/metronome", () => {
    let project = createProject();
    project = play(project);
    expect(project.transport.state).toBe("playing");
    project = pause(project);
    expect(project.transport.state).toBe("paused");
    project = play(project);
    project = setPosition(project, 960);
    expect(project.transport.position).toBe(960);
    project = toggleMetronome(project);
    expect(project.transport.metronomeEnabled).toBe(true);
    project = stop(project);
    expect(project.transport.state).toBe("stopped");
    expect(project.transport.position).toBe(0);
  });
});

describe("core store con undo/redo", () => {
  it("dispatch registra historia y undo restaura", () => {
    const store = createCoreStore(createProject());
    store.dispatch("addTrack", (s) => addTrack(s, "Bass"));
    expect(store.getState().tracks).toHaveLength(1);
    store.dispatch("addClip", (s) =>
      addClip(s, {
        trackId: store.getState().tracks[0].id,
        trackIndex: 0,
        startTick: 0,
        durationTicks: 96,
        color: "#22d3ee",
        name: "C",
      }),
    );
    expect(store.getState().clips).toHaveLength(1);
    expect(store.canUndo()).toBe(true);
    expect(store.undo()).toBe(true);
    expect(store.getState().clips).toHaveLength(0);
    expect(store.undo()).toBe(true);
    expect(store.getState().tracks).toHaveLength(0);
    expect(store.redo()).toBe(true);
    expect(store.getState().tracks).toHaveLength(1);
    expect(store.redo()).toBe(true);
    expect(store.getState().clips).toHaveLength(1);
  });

  it("subscribe notifica cambios", () => {
    const store = createCoreStore(createProject());
    const seen: string[] = [];
    store.subscribe((s) => seen.push(s.name));
    store.dispatch("rename", (s) => setName(s, "Mi proyecto"));
    expect(seen).toEqual(["Mi proyecto"]);
    expect(store.getState().name).toBe("Mi proyecto");
  });

  it("undo de dispatch que no cambia estado no se registra", () => {
    const store = createCoreStore(createProject());
    store.dispatch("noop", (s) => s);
    expect(store.canUndo()).toBe(false);
  });
});

describe("core <-> schema round-trip", () => {
  it("toSchema/fromSchema preservan el proyecto", () => {
    let project = createProject({ name: "Demo", bpm: 128, timeSignature: { beats: 3, beatValue: 4 } });
    project = addTrack(project, "Lead");
    project = setTrackColor(project, project.tracks[0].id, "#ff0000");
    project = addClip(project, {
      trackId: project.tracks[0].id,
      trackIndex: 0,
      startTick: 0,
      durationTicks: 1920,
      color: "#22d3ee",
      name: "Loop",
    });
    project = addNote(project, project.clips[0].id, { note: 60, startTick: 0, durationTicks: 96, velocity: 100 });
    project = addMixerChannel(project, { id: "ch-1", name: "Lead Ch", volume: 0.8 });
    project = setMasterVolume(project, 0.9);

    const schema = toSchema(project);
    const restored = fromSchema(schema);

    expect(restored.name).toBe("Demo");
    expect(restored.bpm).toBe(128);
    expect(restored.timeSignature).toEqual({ beats: 3, beatValue: 4 });
    expect(restored.tracks).toHaveLength(1);
    expect(restored.tracks[0].color).toBe("#ff0000");
    expect(restored.clips).toHaveLength(1);
    expect(restored.clips[0].notes).toHaveLength(1);
    expect(restored.clips[0].notes[0].note).toBe(60);
    expect(restored.mixer.channels).toHaveLength(1);
    expect(restored.mixer.channels[0].volume).toBe(0.8);
    expect(restored.mixer.masterVolume).toBe(0.9);
    expect(restored.meta.nextClipId).toBe(2);
  });

  it("fromSchema agrega buses por defecto si no existen", () => {
    const project = createProject();
    const schema = toSchema(project);
    const restored = fromSchema(schema);
    const ids = restored.mixer.buses.map((b) => b.id);
    expect(ids).toContain("reverb-bus");
    expect(ids).toContain("delay-bus");
  });

  it("round-trip serialize/deserialize funciona headless", () => {
    let project = createProject({ name: "Headless", bpm: 140 });
    project = addTrack(project, "Bass");
    project = addClip(project, {
      trackId: project.tracks[0].id,
      trackIndex: 0,
      startTick: 0,
      durationTicks: 1920,
      color: "#22d3ee",
      name: "Loop",
    });
    project = addNote(project, project.clips[0].id, {
      note: 60,
      startTick: 0,
      durationTicks: 96,
      velocity: 100,
    });

    const json = serialize(toSchema(project));
    const restored = fromSchema(deserialize(json));

    expect(restored.name).toBe("Headless");
    expect(restored.bpm).toBe(140);
    expect(restored.tracks[0].name).toBe("Bass");
    expect(restored.clips[0].notes[0].note).toBe(60);
  });
});
