import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = vi.hoisted(() => ({ state: "stopped", bpm: 120, position: 0, ppqn: 960, timeSignature: { beats: 4, beatValue: 4 } }));

const defaults = { state: "stopped" as const, bpm: 120, position: 0, ppqn: 960, timeSignature: { beats: 4, beatValue: 4 } };

vi.mock("@kaeldaw/audio-engine/AudioContextManager", () => ({
  AudioContextManager: {
    init: vi.fn(),
    resume: vi.fn(() => Promise.resolve()),
    getCurrentTime: vi.fn(() => 0),
    getInstance: vi.fn(() => ({ currentTime: 0, sampleRate: 48000 })),
  },
}));

vi.mock("@kaeldaw/audio-engine/AudioScheduler", () => ({
  AudioScheduler: {
    onPosition: null as ((tick: number) => void) | null,
    noteOn: null,
    noteOff: null,
    running: false,
    setEvents: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    processBlock: vi.fn(),
    dispatchForSample: vi.fn(),
    clearPending: vi.fn(),
    _reset: vi.fn(),
  },
}));

vi.mock("@kaeldaw/audio-engine/Transport", () => ({
  Transport: {
    get state() { return mockState.state; },
    get bpm() { return mockState.bpm; },
    get position() { return mockState.position; },
    get ppqn() { return mockState.ppqn; },
    get timeSignature() { return { ...mockState.timeSignature }; },
    play: vi.fn(() => { mockState.state = "playing"; }),
    stop: vi.fn(() => { mockState.state = "stopped"; mockState.position = 0; }),
    pause: vi.fn(() => { mockState.state = "paused"; }),
    setBpm: vi.fn((bpm: number) => { if (bpm >= 20 && bpm <= 300) mockState.bpm = bpm; }),
    setTimeSignature: vi.fn((beats: number, beatValue: number) => {
      if (beats >= 1 && beatValue >= 1) mockState.timeSignature = { beats, beatValue };
    }),
  },
}));

import { useTransportStore } from "../useTransportStore";

beforeEach(() => {
  Object.assign(mockState, defaults);
  mockState.timeSignature = { ...defaults.timeSignature };
  useTransportStore.setState({
    state: mockState.state,
    bpm: mockState.bpm,
    position: mockState.position,
    ppqn: mockState.ppqn,
    timeSignature: { ...mockState.timeSignature },
  });
});

describe("useTransportStore", () => {
  it("estado inicial coincide con Transport", () => {
    const s = useTransportStore.getState();
    expect(s.state).toBe("stopped");
    expect(s.bpm).toBe(120);
    expect(s.position).toBe(0);
    expect(s.ppqn).toBe(960);
    expect(s.timeSignature).toEqual({ beats: 4, beatValue: 4 });
  });

  it("play() cambia state a playing", async () => {
    await useTransportStore.getState().play();
    expect(useTransportStore.getState().state).toBe("playing");
  });

  it("stop() cambia state a stopped y position a 0", () => {
    useTransportStore.getState().play();
    useTransportStore.getState().stop();
    const s = useTransportStore.getState();
    expect(s.state).toBe("stopped");
    expect(s.position).toBe(0);
  });

  it("pause() cambia state a paused", () => {
    useTransportStore.getState().play();
    useTransportStore.getState().pause();
    expect(useTransportStore.getState().state).toBe("paused");
  });

  it("setBpm(140) actualiza bpm a 140", () => {
    useTransportStore.getState().setBpm(140);
    expect(useTransportStore.getState().bpm).toBe(140);
  });

  it("setBpm(500) fuera de rango no cambia bpm", () => {
    useTransportStore.getState().setBpm(500);
    expect(useTransportStore.getState().bpm).toBe(120);
  });

  it("ppqn se expone como solo lectura", () => {
    const s = useTransportStore.getState();
    expect(s.ppqn).toBe(960);
  });
});
