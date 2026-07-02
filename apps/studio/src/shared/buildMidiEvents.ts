import type { ClipData } from "@kaeldaw/project/useClipsStore";
import { VISUAL_TO_PPQN } from "./constants";

export interface MidiEvent {
  tick: number;
  type: "on" | "off";
  note: number;
  velocity: number;
  channelId: string;
}

export function buildMidiEvents(clips: ClipData[]): MidiEvent[] {
  const events: MidiEvent[] = [];
  for (const clip of clips) {
    const offset = clip.startOffset ?? 0;
    const clipStart = clip.startTick;
    const clipEnd = clip.startTick + clip.durationTicks;
    for (const n of clip.notes) {
      const noteAbsStart = clipStart + n.startTick - offset;
      const noteAbsEnd = noteAbsStart + n.durationTicks;
      const clampedStart = Math.max(clipStart, noteAbsStart);
      const clampedEnd = Math.min(clipEnd, noteAbsEnd);
      if (clampedStart < clampedEnd) {
        events.push({
          tick: clampedStart * VISUAL_TO_PPQN,
          type: "on",
          note: n.note,
          velocity: n.velocity,
          channelId: clip.trackId,
        });
        events.push({
          tick: clampedEnd * VISUAL_TO_PPQN,
          type: "off",
          note: n.note,
          velocity: 0,
          channelId: clip.trackId,
        });
      }
    }
  }
  return events;
}
