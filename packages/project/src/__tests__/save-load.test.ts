import { describe, it, expect, beforeEach } from "vitest";
import { buildProjectSchema, loadProjectSchema } from "../save-load";
import { useProjectStore } from "../useProjectStore";
import { useTracksStore } from "../useTracksStore";
import { useMixerStore } from "../useMixerStore";
import { useClipsStore } from "../useClipsStore";
import { useMidiStore } from "../useMidiStore";
import { useUndoStore } from "../useUndoStore";
import type { ProjectSchema } from "../schema";

beforeEach(() => {
  useProjectStore.setState({ name: "Test", bpm: 120, timeSignature: "4/4", ppqn: 480 });
  useTracksStore.setState({ tracks: [], selectedId: null });
  useMixerStore.setState({ channels: [], masterVolume: 1, masterMeterLevel: 0 });
  useClipsStore.setState({ clips: [], nextId: 1, version: 0 });
  useMidiStore.setState({ clipId: null, notes: [], nextId: 1 });
  useUndoStore.getState().clearHistory();
});

describe("save-load", () => {
  // ── buildProjectSchema ──

  it("FEAT-054-01: buildProjectSchema retorna schema con tracks, mixer, clips", () => {
    useTracksStore.getState().addTrack("Drums");
    useMixerStore.getState().addChannel("Drums", "t1");
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip 1",
    });
    const schema = buildProjectSchema();
    expect(schema.version).toBe("0.1.0");
    expect(schema.name).toBe("Test");
    expect(schema.tracks).toHaveLength(1);
    expect(schema.mixerChannels).toHaveLength(1);
    expect(schema.clips).toHaveLength(1);
    expect(schema.masterVolume).toBe(1);
  });

  it("buildProjectSchema no serializa meterLevel", () => {
    useMixerStore.getState().addChannel("Kick", "t1");
    useMixerStore.getState().setMeterLevel("t1", 0.8);
    const schema = buildProjectSchema();
    expect(schema.mixerChannels[0]).not.toHaveProperty("meterLevel");
  });

  // ── loadProjectSchema ──

  it("FEAT-054-05: loadProjectSchema restaura tracks", () => {
    const schema: ProjectSchema = {
      version: "0.1.0", name: "Loaded", bpm: 140, timeSignature: "3/4", ppqn: 480,
      tracks: [{ id: "t1", name: "Drums" }, { id: "t2", name: "Bass" }],
      mixerChannels: [], masterVolume: 1, clips: [], midiNotes: {},
    };
    loadProjectSchema(schema);
    expect(useTracksStore.getState().tracks).toHaveLength(2);
    expect(useTracksStore.getState().tracks[0].name).toBe("Drums");
  });

  it("FEAT-054-06: loadProjectSchema restaura channels", () => {
    const schema: ProjectSchema = {
      version: "0.1.0", name: "Loaded", bpm: 140, timeSignature: "3/4", ppqn: 480,
      tracks: [],
      mixerChannels: [
        { id: "t1", name: "Kick", volume: 0.8, pan: 0.3, mute: true, solo: false },
      ],
      masterVolume: 0.7, clips: [], midiNotes: {},
    };
    loadProjectSchema(schema);
    expect(useMixerStore.getState().channels).toHaveLength(1);
    expect(useMixerStore.getState().channels[0].volume).toBe(0.8);
    expect(useMixerStore.getState().channels[0].mute).toBe(true);
    expect(useMixerStore.getState().masterVolume).toBe(0.7);
  });

  it("FEAT-054-07: loadProjectSchema restaura clips", () => {
    const schema: ProjectSchema = {
      version: "0.1.0", name: "Loaded", bpm: 140, timeSignature: "3/4", ppqn: 480,
      tracks: [], mixerChannels: [], masterVolume: 1,
      clips: [{ id: 1, trackIndex: 0, trackId: "t1", startTick: 0, durationTicks: 96, color: "#22d3ee", name: "Clip", notes: [] }],
      midiNotes: {},
    };
    loadProjectSchema(schema);
    expect(useClipsStore.getState().clips).toHaveLength(1);
    expect(useClipsStore.getState().clips[0].name).toBe("Clip");
  });

  it("FEAT-054-08: loadProjectSchema limpia selectedId y clipId", () => {
    useTracksStore.getState().addTrack("A");
    useTracksStore.getState().selectTrack("t1");
    useMidiStore.getState().loadForClip(1, []);
    const schema: ProjectSchema = {
      version: "0.1.0", name: "Loaded", bpm: 140, timeSignature: "3/4", ppqn: 480,
      tracks: [{ id: "t2", name: "B" }], mixerChannels: [], masterVolume: 1, clips: [], midiNotes: {},
    };
    loadProjectSchema(schema);
    expect(useTracksStore.getState().selectedId).toBeNull();
    expect(useMidiStore.getState().clipId).toBeNull();
  });

  it("FEAT-054-09: loadProjectSchema resetea meterLevel a 0", () => {
    useMixerStore.getState().addChannel("Kick", "t1");
    useMixerStore.getState().setMeterLevel("t1", 0.9);
    const schema: ProjectSchema = {
      version: "0.1.0", name: "Loaded", bpm: 140, timeSignature: "3/4", ppqn: 480,
      tracks: [],
      mixerChannels: [{ id: "t1", name: "Kick", volume: 1, pan: 0, mute: false, solo: false }],
      masterVolume: 1, clips: [], midiNotes: {},
    };
    loadProjectSchema(schema);
    expect(useMixerStore.getState().channels[0].meterLevel).toBe(0);
  });

  // ── Roundtrip store → schema → store ──

  it("roundtrip buildProjectSchema + loadProjectSchema preserva estado", () => {
    useTracksStore.getState().addTrack("Drums");
    useTracksStore.getState().addTrack("Bass");
    useMixerStore.getState().addChannel("Drums", "t1");
    useMixerStore.getState().addChannel("Bass", "t2");
    useMixerStore.getState().setVolume("t1", 0.8);
    useMixerStore.getState().setVolume("t2", 0.6);
    useClipsStore.getState().addClip({
      trackId: "t1", trackIndex: 0, startTick: 0, durationTicks: 96,
      color: "#22d3ee", name: "Clip 1", notes: [
        { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
      ],
    });

    const schema = buildProjectSchema();

    // Reset stores
    useTracksStore.setState({ tracks: [], selectedId: null });
    useMixerStore.setState({ channels: [], masterVolume: 1, masterMeterLevel: 0 });
    useClipsStore.setState({ clips: [], nextId: 1, version: 0 });

    loadProjectSchema(schema);

    expect(useTracksStore.getState().tracks).toHaveLength(2);
    expect(useMixerStore.getState().channels).toHaveLength(2);
    expect(useMixerStore.getState().channels[0].volume).toBe(0.8);
    expect(useClipsStore.getState().clips).toHaveLength(1);
    expect(useClipsStore.getState().clips[0].notes).toHaveLength(1);
  });
});
