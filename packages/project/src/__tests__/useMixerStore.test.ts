import { describe, it, expect, beforeEach } from "vitest";
import { useMixerStore } from "../useMixerStore";

beforeEach(() => {
  useMixerStore.setState({ channels: [], masterVolume: 1 });
});

describe("useMixerStore", () => {
  it("estado inicial: channels vacio, masterVolume 1", () => {
    const s = useMixerStore.getState();
    expect(s.channels).toEqual([]);
    expect(s.masterVolume).toBe(1);
  });

  it("addChannel() agrega canal con defaults", () => {
    useMixerStore.getState().addChannel();
    const ch = useMixerStore.getState().channels[0];
    expect(ch.volume).toBe(1);
    expect(ch.pan).toBe(0);
    expect(ch.mute).toBe(false);
    expect(ch.solo).toBe(false);
  });

  it("setVolume(id, 0.5) actualiza volumen", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setVolume(id, 0.5);
    expect(useMixerStore.getState().channels[0].volume).toBe(0.5);
  });

  it("setPan(id, -0.5) actualiza pan", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setPan(id, -0.5);
    expect(useMixerStore.getState().channels[0].pan).toBe(-0.5);
  });

  it("toggleMute(id) alterna mute", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().toggleMute(id);
    expect(useMixerStore.getState().channels[0].mute).toBe(true);
    useMixerStore.getState().toggleMute(id);
    expect(useMixerStore.getState().channels[0].mute).toBe(false);
  });

  it("toggleSolo(id) alterna solo", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().toggleSolo(id);
    expect(useMixerStore.getState().channels[0].solo).toBe(true);
  });

  it("setMasterVolume(0.8) actualiza master", () => {
    useMixerStore.getState().setMasterVolume(0.8);
    expect(useMixerStore.getState().masterVolume).toBe(0.8);
  });

  it("setVolume(id, 2) clamp a 1", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setVolume(id, 2);
    expect(useMixerStore.getState().channels[0].volume).toBe(1);
  });

  it("setPan(id, 2) clamp a 1", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setPan(id, 2);
    expect(useMixerStore.getState().channels[0].pan).toBe(1);
  });

  it("removeChannel(id) elimina canal", () => {
    useMixerStore.getState().addChannel("A");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().removeChannel(id);
    expect(useMixerStore.getState().channels).toHaveLength(0);
  });
});
