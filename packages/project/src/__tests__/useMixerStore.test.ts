import { describe, it, expect, beforeEach } from "vitest";
import { useMixerStore } from "../useMixerStore";

beforeEach(() => {
  useMixerStore.setState({ channels: [], buses: [], masterVolume: 1, masterMeterLevel: 0 });
});

describe("useMixerStore", () => {
  it("estado inicial: channels vacio, masterVolume 1", () => {
    const s = useMixerStore.getState();
    expect(s.channels).toEqual([]);
    expect(s.masterVolume).toBe(1);
  });

  it("addChannel() agrega canal con defaults e insertFx/sends", () => {
    useMixerStore.getState().addChannel();
    const ch = useMixerStore.getState().channels[0];
    expect(ch.volume).toBe(1);
    expect(ch.pan).toBe(0);
    expect(ch.mute).toBe(false);
    expect(ch.solo).toBe(false);
    expect(ch.insertFx).toHaveLength(2);
    expect(ch.insertFx[0].type).toBe("delay");
    expect(ch.insertFx[0].enabled).toBe(false);
    expect(ch.insertFx[1].type).toBe("reverb");
    expect(ch.insertFx[1].enabled).toBe(false);
    expect(ch.sends).toHaveLength(2);
    expect(ch.sends[0].busId).toBe("reverb-bus");
    expect(ch.sends[0].level).toBe(0);
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

  it("setSendLevel(id, busId, 0.5) actualiza send del canal", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setSendLevel(id, "reverb-bus", 0.5);
    const ch = useMixerStore.getState().channels[0];
    expect(ch.sends.find((s) => s.busId === "reverb-bus")?.level).toBe(0.5);
  });

  it("setSendLevel clamp entre 0 y 1", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setSendLevel(id, "reverb-bus", 2);
    expect(useMixerStore.getState().channels[0].sends.find((s) => s.busId === "reverb-bus")?.level).toBe(1);
  });

  it("setInsertFxEnabled(id, 0, true) activa delay insert", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setInsertFxEnabled(id, 0, true);
    expect(useMixerStore.getState().channels[0].insertFx[0].enabled).toBe(true);
  });

  it("setInsertFxEnabled(id, 1, true) activa reverb insert", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setInsertFxEnabled(id, 1, true);
    expect(useMixerStore.getState().channels[0].insertFx[1].enabled).toBe(true);
  });

  it("setInsertFxEnabled con index invalido no muta nada", () => {
    useMixerStore.getState().addChannel("Ch");
    const id = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setInsertFxEnabled(id, 99, true);
    expect(useMixerStore.getState().channels[0].insertFx[0].enabled).toBe(false);
  });

  it("addBus() agrega bus con defaults", () => {
    const id = useMixerStore.getState().addBus("FX", "aux");
    const buses = useMixerStore.getState().buses;
    const bus = buses.find((b) => b.id === id);
    expect(bus).toBeDefined();
    expect(bus!.name).toBe("FX");
    expect(bus!.type).toBe("aux");
    expect(bus!.volume).toBe(1);
    expect(bus!.mute).toBe(false);
    expect(bus!.insertFx).toHaveLength(2);
  });

  it("removeBus() elimina bus y limpia routing de canales", () => {
    useMixerStore.getState().addChannel("Ch");
    const chId = useMixerStore.getState().channels[0].id;
    const busId = useMixerStore.getState().addBus("G", "group");
    useMixerStore.getState().setChannelRouting(chId, busId);
    expect(useMixerStore.getState().channels[0].busId).toBe(busId);
    useMixerStore.getState().removeBus(busId);
    expect(useMixerStore.getState().buses.find((b) => b.id === busId)).toBeUndefined();
    expect(useMixerStore.getState().channels[0].busId).toBeUndefined();
  });

  it("setBusVolume(id, 0.5) actualiza volumen del bus", () => {
    const busId = useMixerStore.getState().addBus("FX", "aux");
    useMixerStore.getState().setBusVolume(busId, 0.5);
    expect(useMixerStore.getState().buses.find((b) => b.id === busId)?.volume).toBe(0.5);
  });

  it("setBusVolume clamp a 1", () => {
    const busId = useMixerStore.getState().addBus("FX", "aux");
    useMixerStore.getState().setBusVolume(busId, 2);
    expect(useMixerStore.getState().buses.find((b) => b.id === busId)?.volume).toBe(1);
  });

  it("toggleBusMute(id) alterna mute del bus", () => {
    const busId = useMixerStore.getState().addBus("FX", "aux");
    useMixerStore.getState().toggleBusMute(busId);
    expect(useMixerStore.getState().buses.find((b) => b.id === busId)?.mute).toBe(true);
    useMixerStore.getState().toggleBusMute(busId);
    expect(useMixerStore.getState().buses.find((b) => b.id === busId)?.mute).toBe(false);
  });

  it("setChannelRouting(id) asigna busId al canal", () => {
    useMixerStore.getState().addChannel("Ch");
    const chId = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setChannelRouting(chId, "reverb-bus");
    expect(useMixerStore.getState().channels[0].busId).toBe("reverb-bus");
  });

  it("setChannelRouting(id) sin busId limpia routing", () => {
    useMixerStore.getState().addChannel("Ch");
    const chId = useMixerStore.getState().channels[0].id;
    useMixerStore.getState().setChannelRouting(chId, "reverb-bus");
    useMixerStore.getState().setChannelRouting(chId);
    expect(useMixerStore.getState().channels[0].busId).toBeUndefined();
  });
});
