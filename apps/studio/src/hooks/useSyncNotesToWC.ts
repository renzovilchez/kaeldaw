import { useEffect, type MutableRefObject } from "react";
import type { MidiNoteData } from "@kaeldaw/project/useMidiStore";

export function useSyncNotesToWC(
  elRef: MutableRefObject<HTMLElement | null>,
  notes: MidiNoteData[],
  clipId: number | null,
) {
  useEffect(() => {
    const wc = elRef.current as any;
    if (!wc || clipId === null) return;
    const prevSelected = wc.selectedNoteId as number | null;
    wc.clearNotes();
    for (const note of notes) {
      wc.addNote(note.note, note.startTick, note.durationTicks, note.velocity, note.color, note.id);
    }
    if (prevSelected !== null) {
      const stillExists = wc.getNotes().some((n: any) => n.id === prevSelected);
      if (stillExists) wc.selectedNoteId = prevSelected;
    }
  }, [clipId, notes]);
}
