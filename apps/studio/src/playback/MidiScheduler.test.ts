import { describe, it, expect } from "vitest";

type MidiNote = {
  id: number;
  note: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
};
type Clip = { id: number; startTick: number; notes: MidiNote[] };
type Event = {
  tick: number;
  type: "on" | "off";
  note: number;
  velocity: number;
};

function buildEvents(clips: Clip[]): Event[] {
  const events: Event[] = [];
  for (const clip of clips) {
    for (const n of clip.notes) {
      events.push({
        tick: clip.startTick + n.startTick,
        type: "on",
        note: n.note,
        velocity: n.velocity,
      });
      events.push({
        tick: clip.startTick + n.startTick + n.durationTicks,
        type: "off",
        note: n.note,
        velocity: 0,
      });
    }
  }
  events.sort((a, b) => a.tick - b.tick);
  return events;
}

function fireEvents(events: Event[], position: number): Event[] {
  return events.filter((e) => e.tick <= position);
}

describe("MIDI scheduler", () => {
  it("FEAT-062-01: eventos se ordenan por tick", () => {
    const notes: MidiNote[] = [
      { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
      { id: 2, note: 64, startTick: 48, durationTicks: 24, velocity: 80 },
    ];
    const clips: Clip[] = [{ id: 1, startTick: 0, notes }];
    const events = buildEvents(clips);
    expect(events).toHaveLength(4);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].tick).toBeGreaterThanOrEqual(events[i - 1].tick);
    }
  });

  it("FEAT-062-02: noteOn se dispara cuando position alcanza tick", () => {
    const notes: MidiNote[] = [
      { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
    ];
    const clips: Clip[] = [{ id: 1, startTick: 0, notes }];
    const events = buildEvents(clips);

    const atPos0 = fireEvents(events, 0);
    expect(atPos0).toHaveLength(1);
    expect(atPos0[0].type).toBe("on");
    expect(atPos0[0].note).toBe(60);
  });

  it("FEAT-062-03: noteOff se dispara cuando position alcanza tick + duration", () => {
    const notes: MidiNote[] = [
      { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
    ];
    const clips: Clip[] = [{ id: 1, startTick: 0, notes }];
    const events = buildEvents(clips);

    const atPos24 = fireEvents(events, 24);
    expect(atPos24).toHaveLength(2);
    expect(atPos24[0].type).toBe("on");
    expect(atPos24[1].type).toBe("off");
    expect(atPos24[1].note).toBe(60);
  });

  it("FEAT-062-04: eventIndex avanza solo cuando position supera tick", () => {
    const notes: MidiNote[] = [
      { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
      { id: 2, note: 67, startTick: 48, durationTicks: 24, velocity: 90 },
    ];
    const clips: Clip[] = [{ id: 1, startTick: 0, notes }];
    const events = buildEvents(clips);

    expect(fireEvents(events, 0)).toHaveLength(1);
    expect(fireEvents(events, 24)).toHaveLength(2);
    expect(fireEvents(events, 48)).toHaveLength(3);
    expect(fireEvents(events, 72)).toHaveLength(4);
  });

  it("clips con offset startTick afectan timing de eventos", () => {
    const notes: MidiNote[] = [
      { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
    ];
    const clips: Clip[] = [{ id: 1, startTick: 96, notes }];
    const events = buildEvents(clips);

    expect(events[0].tick).toBe(96);
    expect(events[1].tick).toBe(120);
  });

  it("multiples clips producen eventos mezclados ordenados", () => {
    const clips: Clip[] = [
      {
        id: 1,
        startTick: 0,
        notes: [
          { id: 1, note: 60, startTick: 0, durationTicks: 24, velocity: 100 },
        ],
      },
      {
        id: 2,
        startTick: 10,
        notes: [
          { id: 2, note: 67, startTick: 0, durationTicks: 12, velocity: 90 },
        ],
      },
    ];
    const events = buildEvents(clips);
    // noteOn@0, noteOn@10, noteOff@12, noteOff@24
    expect(events[0].tick).toBe(0);
    expect(events[1].tick).toBe(10);
    expect(events[2].tick).toBe(22);
    expect(events[3].tick).toBe(24);
  });
});
