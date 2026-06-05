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
