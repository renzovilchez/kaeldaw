import {
  useRef,
  useEffect,
  createElement,
  memo,
} from "react";
import { useCore, project } from "../stores/useCoreStore";
import { usePianoClipId } from "../stores/usePianoClipStore";
import type { CoreMidiNote } from "@kaeldaw/project/core";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";
import { useSyncNotesToWC } from "./hooks/useSyncNotesToWC";
import { instrumentManager } from "../shared/instrumentManager";
import { PPQN_TO_VISUAL } from "../shared/constants";

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
  getNotes(): CoreMidiNote[];
}

const EMPTY_NOTES: CoreMidiNote[] = [];

export const PianoRollWindow = memo(function PianoRollWindow() {
  const position = useCore((s) => s.transport.position);
  const clipId = usePianoClipId();
  const notes = useCore((s) => {
    if (clipId === null) return EMPTY_NOTES;
    return s.clips.find((c) => c.id === clipId)?.notes ?? EMPTY_NOTES;
  });
  const elRef = useRef<PianoRollWC>(null);
  const previewStartedRef = useRef(false);
  const previewStateRef = useRef(new Map<number, boolean>());
  const transportState = useCore((s) => s.transport.state);
  const clipIdRef = useRef(clipId);
  useEffect(() => {
    clipIdRef.current = clipId;
  }, [clipId]);

  useEffect(() => {
    if (transportState !== "playing") previewStartedRef.current = false;
  }, [transportState]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.playheadTick = position * PPQN_TO_VISUAL;
  }, [position]);

  useSyncNotesToWC(elRef, notes, clipId);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const onNoteAdd = (e: Event) => {
      const clip = clipIdRef.current;
      if (clip === null) return;
      const d = (e as CustomEvent).detail;
      project.addNote(
        clip,
        {
          note: d.note,
          startTick: d.startTick,
          durationTicks: d.durationTicks,
          velocity: 100,
          color: "#22d3ee",
        },
        d.noteId,
      );
    };

    const onNoteMove = (e: Event) => {
      const clip = clipIdRef.current;
      if (clip === null) return;
      const d = (e as CustomEvent).detail;
      project.updateNote(clip, d.noteId, { note: d.note, startTick: d.startTick });
    };

    const onNoteResize = (e: Event) => {
      const clip = clipIdRef.current;
      if (clip === null) return;
      const d = (e as CustomEvent).detail;
      project.updateNote(clip, d.noteId, {
        startTick: d.startTick,
        durationTicks: d.durationTicks,
      });
    };

    const onNoteDelete = (e: Event) => {
      const clip = clipIdRef.current;
      if (clip === null) return;
      const d = (e as CustomEvent).detail;
      project.removeNote(clip, d.noteId);
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

    el.addEventListener("note-add", onNoteAdd);
    el.addEventListener("note-move", onNoteMove);
    el.addEventListener("note-resize", onNoteResize);
    el.addEventListener("note-delete", onNoteDelete);
    el.addEventListener("key-preview", onKeyPreview);
    el.addEventListener("key-release", onKeyRelease);
    return () => {
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
