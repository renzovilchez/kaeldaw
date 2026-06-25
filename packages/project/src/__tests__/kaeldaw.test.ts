import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import {
  saveToBlob,
  loadFromBlob,
  loadFromFile,
  KaeldawError,
} from "../kaeldaw";
import { type ProjectSchema } from "../schema";

const validProject: ProjectSchema = {
  version: "0.1.0",
  name: "Test Project",
  bpm: 128,
  timeSignature: "3/4",
  ppqn: 480,
  tracks: [
    { id: "t1", name: "Track 1" },
    { id: "t2", name: "Track 2" },
  ],
  mixerChannels: [
    { id: "t1", name: "Track 1", volume: 1, pan: 0, mute: false, solo: false },
    { id: "t2", name: "Track 2", volume: 0.75, pan: -0.5, mute: false, solo: true },
  ],
  buses: [],
  masterVolume: 1,
  clips: [],
  midiNotes: {},
};

describe(".kaeldaw serialization", () => {
  it("saveToBlob genera un Blob con type application/zip", async () => {
    const blob = await saveToBlob(validProject);
    expect(blob.type).toBe("application/zip");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("loadFromBlob(saveToBlob(p)) roundtrip deep equal", async () => {
    const blob = await saveToBlob(validProject);
    const result = await loadFromBlob(blob);
    expect(result).toEqual(validProject);
  });

  it("loadFromFile con File valido retorna ProjectSchema", async () => {
    const blob = await saveToBlob(validProject);
    const file = new File([blob], "project.kaeldaw", { type: blob.type });
    const result = await loadFromFile(file);
    expect(result).toEqual(validProject);
  });

  it("loadFromBlob con ZIP sin project.json lanza KaeldawError", async () => {
    const badZip = zipSync({ "other.txt": strToU8("hello") }, { level: 0 });
    const blob = new Blob([badZip], { type: "application/zip" });
    await expect(loadFromBlob(blob)).rejects.toThrow(KaeldawError);
    await expect(loadFromBlob(blob)).rejects.toThrow(
      "Missing project.json in .kaeldaw archive",
    );
  });

  it("loadFromBlob con Blob invalido (no ZIP) lanza KaeldawError", async () => {
    const blob = new Blob(["not-a-zip"], { type: "application/octet-stream" });
    await expect(loadFromBlob(blob)).rejects.toThrow(KaeldawError);
    await expect(loadFromBlob(blob)).rejects.toThrow(
      "Invalid .kaeldaw archive",
    );
  });

  it("saveToBlob y loadFromBlob preservan todos los campos de ProjectSchema", async () => {
    const project: ProjectSchema = {
      version: "0.1.0",
      name: "Complex Project",
      bpm: 200,
      timeSignature: "7/8",
      ppqn: 1920,
      tracks: [
        { id: "a", name: "Drums" },
        { id: "b", name: "Bass" },
        { id: "c", name: "Synth" },
      ],
      mixerChannels: [
        { id: "a", name: "Drums", volume: 0.8, pan: 0, mute: false, solo: false },
        { id: "b", name: "Bass", volume: 1, pan: 0.3, mute: true, solo: false },
        { id: "c", name: "Synth", volume: 0.5, pan: -0.7, mute: false, solo: false },
      ],
      buses: [],
      masterVolume: 0.9,
      clips: [{ id: 1, trackIndex: 0, trackId: "a", startTick: 0, durationTicks: 96, color: "#22d3ee", name: "Clip 1", notes: [] }],
      midiNotes: {},
    };
    const blob = await saveToBlob(project);
    const result = await loadFromBlob(blob);
    expect(result.version).toBe("0.1.0");
    expect(result.name).toBe("Complex Project");
    expect(result.bpm).toBe(200);
    expect(result.timeSignature).toBe("7/8");
    expect(result.ppqn).toBe(1920);
    expect(result.tracks).toHaveLength(3);
    expect(result.tracks[0].id).toBe("a");
  });
});
