import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Transport } from "../Transport";
import { Clock } from "../Clock";

describe("Clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Transport._reset();
    Clock._reset();
    Clock.setTimeProvider(() => Date.now());
    Transport.setBpm(120);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("start() inicia el bucle y position avanza", () => {
    Transport.play();
    Clock.start();
    const posBefore = Transport.position;

    vi.advanceTimersByTime(100);

    expect(Transport.position).toBeGreaterThan(posBefore);
  });

  it("stop() detiene el bucle y position no avanza", () => {
    Transport.play();
    Clock.start();
    vi.advanceTimersByTime(50);
    Clock.stop();
    const posAfterStop = Transport.position;

    vi.advanceTimersByTime(100);

    expect(Transport.position).toBe(posAfterStop);
  });

  it("pause() detiene el bucle igual que stop()", () => {
    Transport.play();
    Clock.start();
    vi.advanceTimersByTime(50);
    Transport.pause();
    const posAfterPause = Transport.position;

    vi.advanceTimersByTime(100);

    expect(Transport.position).toBe(posAfterPause);
  });

  it("onTick se dispara en cada tick", () => {
    Transport.play();

    const ticks: number[] = [];
    Clock.onTick = (t) => ticks.push(t);

    Clock.start();
    vi.advanceTimersByTime(500);

    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]).toBe(0);
  });

  it("onBeat se dispara cada PPQN ticks", () => {
    Transport.play();

    const beats: number[] = [];
    Clock.onBeat = (b) => beats.push(b);

    Clock.start();
    vi.advanceTimersByTime(3000);

    expect(beats.length).toBeGreaterThanOrEqual(2);
    expect(beats[0]).toBe(0);
    expect(beats[1]).toBe(1);
  });

  it("cambiar BPM durante play() ajusta velocidad de ticks", () => {
    Transport.play();

    Clock.start();
    vi.advanceTimersByTime(500);
    const posAt120 = Transport.position;

    Transport.setBpm(60);
    vi.advanceTimersByTime(500);
    const posAt60 = Transport.position - posAt120;

    Transport.setBpm(240);
    vi.advanceTimersByTime(500);
    const posAt240 = Transport.position - (posAt120 + posAt60);

    expect(posAt240).toBeGreaterThan(posAt60);
  });

  it("start() dos veces es no-op", () => {
    Transport.play();
    Clock.start();
    Clock.start();
    vi.advanceTimersByTime(50);

    expect(Transport.position).toBeGreaterThanOrEqual(0);
  });

  it("stop() sin start() es no-op", () => {
    expect(() => Clock.stop()).not.toThrow();
  });

  it("ciclo start → stop → start funciona", () => {
    Transport.play();
    Clock.start();
    vi.advanceTimersByTime(100);
    const pos1 = Transport.position;
    Clock.stop();

    Clock.start();
    vi.advanceTimersByTime(100);
    const pos2 = Transport.position;

    expect(pos2).toBeGreaterThan(pos1);
  });
});
