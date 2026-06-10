import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "../useProjectStore";
import type { ProjectSchema } from "../schema";

const defaultState = { name: "Untitled", bpm: 120, timeSignature: "4/4", ppqn: 960 };

beforeEach(() => {
  useProjectStore.setState(defaultState);
});

describe("useProjectStore", () => {
  it("estado inicial: Untitled, 120bpm, 4/4, 960ppqn", () => {
    const s = useProjectStore.getState();
    expect(s.name).toBe("Untitled");
    expect(s.bpm).toBe(120);
    expect(s.timeSignature).toBe("4/4");
    expect(s.ppqn).toBe(960);
  });

  it("setName actualiza nombre", () => {
    useProjectStore.getState().setName("MiProyecto");
    expect(useProjectStore.getState().name).toBe("MiProyecto");
  });

  it("setBpm actualiza BPM", () => {
    useProjectStore.getState().setBpm(140);
    expect(useProjectStore.getState().bpm).toBe(140);
  });

  it("setBpm fuera de rango clamp", () => {
    useProjectStore.getState().setBpm(500);
    expect(useProjectStore.getState().bpm).toBe(300);
    useProjectStore.getState().setBpm(10);
    expect(useProjectStore.getState().bpm).toBe(20);
  });

  it("loadFromSchema carga metadata", () => {
    const schema: ProjectSchema = {
      version: "0.1.0",
      name: "Loaded Project",
      bpm: 200,
      timeSignature: "7/8",
      ppqn: 1920,
      tracks: [],
      mixerChannels: [],
      masterVolume: 1,
      clips: [],
      midiNotes: {},
    };
    useProjectStore.getState().loadFromSchema(schema);
    const s = useProjectStore.getState();
    expect(s.name).toBe("Loaded Project");
    expect(s.bpm).toBe(200);
    expect(s.timeSignature).toBe("7/8");
    expect(s.ppqn).toBe(1920);
  });

  it("reset() restaura default", () => {
    useProjectStore.getState().setBpm(200);
    useProjectStore.getState().setName("Custom");
    useProjectStore.getState().reset();
    const s = useProjectStore.getState();
    expect(s.name).toBe("Untitled");
    expect(s.bpm).toBe(120);
    expect(s.timeSignature).toBe("4/4");
  });

  it("setTimeSignature invalido no cambia", () => {
    useProjectStore.getState().setTimeSignature("invalid");
    expect(useProjectStore.getState().timeSignature).toBe("4/4");
  });
});
