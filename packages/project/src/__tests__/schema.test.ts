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
});
