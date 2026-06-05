import { describe, it, expect } from "vitest";
import { AudioBridge } from "../AudioBridge";

describe("AudioBridge", () => {
  it("crea buffer con 64 slots vacios", () => {
    const bridge = new AudioBridge();
    expect(bridge.capacity).toBe(64);
    expect(bridge.available).toBe(0);
  });

  it("sendCommand + readCommand entrega comando correctamente", () => {
    const bridge = new AudioBridge();
    const ok = bridge.sendCommand(1, [0.5, 440, 0]);
    expect(ok).toBe(true);

    const cmd = bridge.readCommand();
    expect(cmd).not.toBeNull();
    expect(cmd!.type).toBe(1);
    expect(cmd!.payload[0]).toBe(0.5);
    expect(cmd!.payload[1]).toBe(440);
    expect(cmd!.payload[2]).toBe(0);
  });

  it("sendCommand + sendCommand + readCommand + readCommand mantiene FIFO", () => {
    const bridge = new AudioBridge();

    bridge.sendCommand(1, [1, 0, 0]);
    bridge.sendCommand(2, [2, 0, 0]);

    const cmd1 = bridge.readCommand();
    expect(cmd1!.type).toBe(1);

    const cmd2 = bridge.readCommand();
    expect(cmd2!.type).toBe(2);
  });

  it("writeStatus + readStatus sincroniza estado", () => {
    const bridge = new AudioBridge();
    bridge.writeStatus(100, 200);
    const status = bridge.readStatus();
    expect(status[0]).toBe(100);
    expect(status[1]).toBe(200);
  });

  it("buffer vacio devuelve null en readCommand", () => {
    const bridge = new AudioBridge();
    expect(bridge.readCommand()).toBeNull();
  });

  it("buffer lleno devuelve false en sendCommand", () => {
    const bridge = new AudioBridge();
    for (let i = 0; i < 64; i++) {
      expect(bridge.sendCommand(1, [i, 0, 0])).toBe(true);
    }
    expect(bridge.sendCommand(1, [99, 0, 0])).toBe(false);
  });

  it("wrap-around del ring buffer funciona", () => {
    const bridge = new AudioBridge();

    for (let i = 0; i < 64; i++) {
      bridge.sendCommand(1, [i, 0, 0]);
    }
    for (let i = 0; i < 64; i++) {
      const cmd = bridge.readCommand();
      expect(cmd!.payload[0]).toBe(i);
    }
    expect(bridge.readCommand()).toBeNull();

    for (let i = 0; i < 64; i++) {
      expect(bridge.sendCommand(2, [i + 100, 0, 0])).toBe(true);
    }
    for (let i = 0; i < 64; i++) {
      const cmd = bridge.readCommand();
      expect(cmd!.type).toBe(2);
      expect(cmd!.payload[0]).toBe(i + 100);
    }
  });

  it("payload float64 se serializa correctamente", () => {
    const bridge = new AudioBridge();
    bridge.sendCommand(1, [Math.PI, Math.E, 1.23456789]);
    const cmd = bridge.readCommand();
    expect(cmd!.payload[0]).toBeCloseTo(Math.PI);
    expect(cmd!.payload[1]).toBeCloseTo(Math.E);
    expect(cmd!.payload[2]).toBeCloseTo(1.23456789);
  });
});
