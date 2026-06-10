import { describe, it, expect } from "vitest";
import {
  deserialize,
  serialize,
  getVersion,
  SchemaValidationError,
  type ProjectSchema,
} from "../schema";

const validProject: ProjectSchema = {
  version: "0.1.0",
  name: "Mi Proyecto",
  bpm: 120,
  timeSignature: "4/4",
  ppqn: 960,
  tracks: [],
  mixerChannels: [],
  masterVolume: 1,
  clips: [],
  midiNotes: {},
};

describe("ProjectSchema", () => {
  it("deserialize con project.json valido retorna ProjectSchema tipado", () => {
    const input = JSON.stringify(validProject);
    const result = deserialize(input);
    expect(result.name).toBe("Mi Proyecto");
    expect(result.bpm).toBe(120);
    expect(result.version).toBe("0.1.0");
  });

  it("serialize produce JSON string con field version", () => {
    const json = serialize(validProject);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("version");
    expect(parsed.version).toBe("0.1.0");
  });

  it("roundtrip deserialize(serialize(p)) deep equal", () => {
    const json = serialize(validProject);
    const result = deserialize(json);
    expect(result).toEqual(validProject);
  });

  it("getVersion retorna 0.1.0", () => {
    expect(getVersion()).toBe("0.1.0");
  });

  it("version invalida lanza SchemaValidationError", () => {
    const input = JSON.stringify({ ...validProject, version: "abc" });
    expect(() => deserialize(input)).toThrow(SchemaValidationError);
  });

  it("bpm fuera de rango (10) lanza SchemaValidationError", () => {
    const input = JSON.stringify({ ...validProject, bpm: 10 });
    expect(() => deserialize(input)).toThrow(SchemaValidationError);
  });

  it("bpm fuera de rango (400) lanza SchemaValidationError", () => {
    const input = JSON.stringify({ ...validProject, bpm: 400 });
    expect(() => deserialize(input)).toThrow(SchemaValidationError);
  });

  it("timeSignature formato invalido lanza SchemaValidationError", () => {
    const input = JSON.stringify({ ...validProject, timeSignature: "4/4/4" });
    expect(() => deserialize(input)).toThrow(SchemaValidationError);
  });

  it("ppqn negativo lanza SchemaValidationError", () => {
    const input = JSON.stringify({ ...validProject, ppqn: -1 });
    expect(() => deserialize(input)).toThrow(SchemaValidationError);
  });

  it("tracks no es array lanza SchemaValidationError", () => {
    const input = JSON.stringify({ ...validProject, tracks: "not-array" });
    expect(() => deserialize(input)).toThrow(SchemaValidationError);
  });

  it("version futura lanza SchemaValidationError", () => {
    const input = JSON.stringify({ ...validProject, version: "99.0.0" });
    expect(() => deserialize(input)).toThrow(SchemaValidationError);
  });

  it("name vacio lanza SchemaValidationError", () => {
    const input = JSON.stringify({ ...validProject, name: "" });
    expect(() => deserialize(input)).toThrow(SchemaValidationError);
  });

  it("deserialize con JSON no valido lanza SchemaValidationError", () => {
    const input = JSON.stringify({ ...validProject, bpm: "not-a-number" });
    expect(() => deserialize(input)).toThrow(SchemaValidationError);
  });

  // ── Backward compatibility: clips y midiNotes opcionales ──

  it("FEAT-053-05: deserialize sin campo clips retorna clips=[]", () => {
    const withoutClips = { version: validProject.version, name: validProject.name, bpm: validProject.bpm, timeSignature: validProject.timeSignature, ppqn: validProject.ppqn, tracks: validProject.tracks };
    const input = JSON.stringify(withoutClips);
    const result = deserialize(input);
    expect(result.clips).toEqual([]);
  });

  it("FEAT-053-06: deserialize sin campo midiNotes retorna midiNotes={}", () => {
    const withoutMidi = { version: validProject.version, name: validProject.name, bpm: validProject.bpm, timeSignature: validProject.timeSignature, ppqn: validProject.ppqn, tracks: validProject.tracks };
    const input = JSON.stringify(withoutMidi);
    const result = deserialize(input);
    expect(result.midiNotes).toEqual({});
  });

  it("FEAT-053-07: deserialize con clips como string invalido retorna clips=[]", () => {
    const input = JSON.stringify({ ...validProject, clips: "not-an-array" });
    const result = deserialize(input);
    expect(result.clips).toEqual([]);
  });

  it("FEAT-053-08: deserialize con midiNotes como array invalido retorna midiNotes={}", () => {
    const input = JSON.stringify({ ...validProject, midiNotes: [1, 2, 3] });
    const result = deserialize(input);
    expect(result.midiNotes).toEqual({});
  });

  // ── Clips en serialize ──

  it("FEAT-053-15: serialize con clips produce JSON con array de clips", () => {
    const withClips: ProjectSchema = {
      ...validProject,
      clips: [
        { id: 1, trackIndex: 0, trackId: "t1", startTick: 0, durationTicks: 96, color: "#22d3ee", name: "Clip 1", notes: [] },
      ],
    };
    const json = JSON.parse(serialize(withClips));
    expect(json.clips).toHaveLength(1);
    expect(json.clips[0].name).toBe("Clip 1");
  });

  it("FEAT-053-16: serialize con midiNotes produce JSON con Record de notas", () => {
    const withMidi: ProjectSchema = {
      ...validProject,
      midiNotes: {
        1: [{ id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 }],
      },
    };
    const json = JSON.parse(serialize(withMidi));
    expect(json.midiNotes["1"]).toHaveLength(1);
    expect(json.midiNotes["1"][0].note).toBe(60);
  });

  // ── Roundtrip con clips ──

  it("roundtrip con clips y midiNotes preserva datos", () => {
    const full: ProjectSchema = {
      ...validProject,
      clips: [
        { id: 1, trackIndex: 0, trackId: "t1", startTick: 0, durationTicks: 96, color: "#22d3ee", name: "Clip 1",
          notes: [{ id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 }] },
      ],
      midiNotes: { 1: [{ id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 }] },
    };
    const result = deserialize(serialize(full));
    expect(result).toEqual(full);
  });
});
