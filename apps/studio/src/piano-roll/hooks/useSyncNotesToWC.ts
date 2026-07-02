import { useEffect, type MutableRefObject } from "react";
import type { MidiNoteData } from "@kaeldaw/project/useMidiStore";

interface PianoRollWC extends HTMLElement {
  selectedNoteId: number | null;
  clearNotes(): void;
  addNote(
    note: number,
    startTick: number,
    durationTicks: number,
    velocity: number,
    color?: string,
    id?: number,
  ): void;
  getNotes(): MidiNoteData[];
}

export function useSyncNotesToWC(
  elRef: MutableRefObject<PianoRollWC | null>,
  notes: MidiNoteData[],
  clipId: number | null,
) {
  useEffect(() => {
    const wc = elRef.current;
    if (!wc || clipId === null) return;
    const prevSelected = wc.selectedNoteId;
    wc.clearNotes();
    for (const note of notes) {
      wc.addNote(
        note.note,
        note.startTick,
        note.durationTicks,
        note.velocity,
        note.color,
        note.id,
      );
    }
    if (prevSelected !== null) {
      const stillExists = wc.getNotes().some((n) => n.id === prevSelected);
      if (stillExists) wc.selectedNoteId = prevSelected;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipId, notes]);
}
