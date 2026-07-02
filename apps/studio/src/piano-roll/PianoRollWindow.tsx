import {
  useRef,
  useEffect,
  createElement,
  memo,
  type MutableRefObject,
} from "react";
import { useTransportStore } from "@kaeldaw/project/useTransportStore";
import { useMidiStore } from "@kaeldaw/project/useMidiStore";
import { useUndoStore, type UndoContext } from "@kaeldaw/project/useUndoStore";
import type { MidiNoteData } from "@kaeldaw/project/useClipsStore";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";
import { useSyncNotesToWC } from "./hooks/useSyncNotesToWC";
import { instrumentManager } from "../shared/instrumentManager";
import { PPQN_TO_VISUAL } from "../shared/constants";
import { createUndoRedo } from "../shared/hooks/useRegisterUndoRedo";

interface PianoRollWC extends HTMLElement {
  playheadTick: number;
  clipId: number | null;
  selectedNoteId: number | null;
  clearNotes(): void;
  addNote(
    note: number,
    startTick: number,
    durationTicks: number,
    velocity: number,
    color: string,
    id?: number,
  ): void;
  getNotes(): MidiNoteData[];
}

export const PianoRollWindow = memo(function PianoRollWindow({
  undoRefs,
  redoRefs,
}: {
  undoRefs: MutableRefObject<Record<UndoContext, (() => void) | null>>;
  redoRefs: MutableRefObject<Record<UndoContext, (() => void) | null>>;
}) {
  const position = useTransportStore((s) => s.position);
  const notes = useMidiStore((s) => s.notes);
  const clipId = useMidiStore((s) => s.clipId);
  const addNote = useMidiStore((s) => s.addNote);
  const moveNote = useMidiStore((s) => s.moveNote);
  const resizeNote = useMidiStore((s) => s.resizeNote);
  const removeNote = useMidiStore((s) => s.removeNote);
  const elRef = useRef<PianoRollWC>(null);
  const previewStartedRef = useRef(false);
  const previewStateRef = useRef(new Map<number, boolean>());
  const transportState = useTransportStore((s) => s.state);
  useEffect(() => {
    if (transportState !== "playing") previewStartedRef.current = false;
  }, [transportState]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.playheadTick = position * PPQN_TO_VISUAL;
  }, [position]);

  useSyncNotesToWC(elRef, notes, clipId);

  const handlersRef = useRef({ addNote, moveNote, resizeNote, removeNote });
  useEffect(() => {
    handlersRef.current = { addNote, moveNote, resizeNote, removeNote };
  }, [addNote, moveNote, resizeNote, removeNote]);

  useEffect(() => {
    const undoStore = undoRefs.current;
    const redoStore = redoRefs.current;

    const { undo, redo } = createUndoRedo("pianoRoll",
      () => ({ notes: elRef.current?.getNotes() ?? [], clipId: useMidiStore.getState().clipId }),
      (snap) => {
        const wc = elRef.current;
        if (!wc || snap.clipId === null) return;
        wc.clearNotes();
        for (const n of snap.notes) wc.addNote(n.note, n.startTick, n.durationTicks, n.velocity, n.color ?? "#22d3ee", n.id);
        useMidiStore.setState({ clipId: snap.clipId, notes: snap.notes.map((n) => ({ ...n })) });
        useMidiStore.getState().syncToClips();
      },
    );
    undoStore.pianoRoll = undo;
    redoStore.pianoRoll = redo;
    return () => { undoStore.pianoRoll = null; redoStore.pianoRoll = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const h = handlersRef.current;

    const sync = () => useMidiStore.getState().syncToClips();

    const onBeforeNoteAction = (e: Event) => {
      const d = (e as CustomEvent).detail;
      useUndoStore.getState().executeAction("pianoRoll", () => ({
        notes: d.notes,
        clipId: useMidiStore.getState().clipId,
      }));
    };

    const onNoteAdd = (e: Event) => {
      const d = (e as CustomEvent).detail;
      h.addNote(
        {
          note: d.note,
          startTick: d.startTick,
          durationTicks: d.durationTicks,
          velocity: 100,
          color: "#22d3ee",
        },
        d.noteId,
      );
      sync();
    };

    const onNoteMove = (e: Event) => {
      const d = (e as CustomEvent).detail;
      h.moveNote(d.noteId, d.note, d.startTick);
      sync();
    };

    const onNoteResize = (e: Event) => {
      const d = (e as CustomEvent).detail;
      h.resizeNote(d.noteId, d.startTick, d.durationTicks);
      sync();
    };

    const onNoteDelete = (e: Event) => {
      const d = (e as CustomEvent).detail;
      h.removeNote(d.noteId);
      sync();
    };

    const onKeyPreview = async (e: Event) => {
      const { note } = (e as CustomEvent).detail;
      previewStateRef.current.set(note, true);
      try {
        if (!previewStartedRef.current) {
          AudioContextManager.init();
          await PolySynthOutput.start();
          PolySynthOutput.setConfig(instrumentManager.getSelectedConfig());
          previewStartedRef.current = true;
        }
        if (previewStateRef.current.get(note)) {
          const eng = instrumentManager.selectedPreset?.engine ?? "synth";
          PolySynthOutput.noteOn(note, 100, "", eng);
        }
      } catch (err) {
        console.error("Key preview failed:", err);
      }
    };

    const onKeyRelease = (e: Event) => {
      const { note } = (e as CustomEvent).detail;
      previewStateRef.current.set(note, false);
      PolySynthOutput.noteOff(note);
    };

    el.addEventListener("before-note-action", onBeforeNoteAction);
    el.addEventListener("note-add", onNoteAdd);
    el.addEventListener("note-move", onNoteMove);
    el.addEventListener("note-resize", onNoteResize);
    el.addEventListener("note-delete", onNoteDelete);
    el.addEventListener("key-preview", onKeyPreview);
    el.addEventListener("key-release", onKeyRelease);
    return () => {
      el.removeEventListener("before-note-action", onBeforeNoteAction);
      el.removeEventListener("note-add", onNoteAdd);
      el.removeEventListener("note-move", onNoteMove);
      el.removeEventListener("note-resize", onNoteResize);
      el.removeEventListener("note-delete", onNoteDelete);
      el.removeEventListener("key-preview", onKeyPreview);
      el.removeEventListener("key-release", onKeyRelease);
    };
  }, []);

  return createElement("daw-piano-roll", {
    ref: elRef,
    style: { width: "100%", height: "100%", display: "block" },
  });
});
