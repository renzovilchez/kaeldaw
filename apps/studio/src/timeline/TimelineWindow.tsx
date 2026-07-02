import {
  useRef,
  useEffect,
  createElement,
  useCallback,
  memo,
  type MutableRefObject,
} from "react";
import { useTracksStore } from "@kaeldaw/project/useTracksStore";
import { useTransportStore } from "@kaeldaw/project/useTransportStore";
import { useClipsStore } from "@kaeldaw/project/useClipsStore";
import type { MidiNoteData } from "@kaeldaw/project/useClipsStore";
import { useMidiStore } from "@kaeldaw/project/useMidiStore";
import { useUndoStore, type UndoContext } from "@kaeldaw/project/useUndoStore";
import { useWindowManager } from "../shared/components/useWindowManager";
import { PPQN_TO_VISUAL } from "../shared/constants";
import { createUndoRedo } from "../shared/hooks/useRegisterUndoRedo";

interface TimelineClipData {
  id: number;
  trackIndex: number;
  startTick: number;
  durationTicks: number;
  color: string;
  name: string;
  notes: MidiNoteData[];
  startOffset: number;
}

interface TimelineWC extends HTMLElement {
  numTracks: number;
  playheadTick: number;
  _nextClipId: number;
  selectedClipId: number | null;
  clearClips(): void;
  addClip(
    trackIndex: number,
    startTick: number,
    durationTicks: number,
    color: string,
    name: string,
    id?: number,
    notes?: MidiNoteData[],
    startOffset?: number,
  ): number;
  getClips(): TimelineClipData[];
}

export const TimelineWindow = memo(function TimelineWindow({
  undoRefs,
  redoRefs,
}: {
  undoRefs: MutableRefObject<Record<UndoContext, (() => void) | null>>;
  redoRefs: MutableRefObject<Record<UndoContext, (() => void) | null>>;
}) {
  const tracks = useTracksStore((s) => s.tracks);
  const position = useTransportStore((s) => s.position);
  const clips = useClipsStore((s) => s.clips);
  const addClip = useClipsStore((s) => s.addClip);
  const moveClip = useClipsStore((s) => s.moveClip);
  const resizeClip = useClipsStore((s) => s.resizeClip);
  const trimClip = useClipsStore((s) => s.trimClip);
  const removeClip = useClipsStore((s) => s.removeClip);
  const { open } = useWindowManager();
  const elRef = useRef<TimelineWC>(null);

  const tracksRef = useRef(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.numTracks = tracks.length;
  }, [tracks.length]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.playheadTick = position * PPQN_TO_VISUAL;
  }, [position]);

  const version = useClipsStore((s) => s.version);
  useEffect(() => {
    const wc = elRef.current;
    if (!wc) return;
    wc.clearClips();
    let maxId = 0;
    for (const clip of clips) {
      const notes = clip.notes.map((n) => ({ ...n }));
      wc.addClip(
        clip.trackIndex,
        clip.startTick,
        clip.durationTicks,
        clip.color,
        clip.name,
        clip.id,
        notes,
        clip.startOffset,
      );
      if (clip.id > maxId) maxId = clip.id;
    }
    wc._nextClipId = maxId + 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const handlersRef = useRef({
    addClip,
    moveClip,
    resizeClip,
    trimClip,
    removeClip,
  });
  useEffect(() => {
    handlersRef.current = {
      addClip,
      moveClip,
      resizeClip,
      trimClip,
      removeClip,
    };
  }, [addClip, moveClip, resizeClip, trimClip, removeClip]);

  useEffect(() => {
    const undoStore = undoRefs.current;
    const redoStore = redoRefs.current;

    const { undo, redo } = createUndoRedo(
      "timeline",
      () => ({
        clips: elRef.current?.getClips() ?? [],
        nextId: elRef.current?._nextClipId ?? 0,
      }),
      (snap) => {
        const wc = elRef.current;
        if (!wc) return;
        wc.clearClips();
        for (const clip of snap.clips)
          wc.addClip(
            clip.trackIndex,
            clip.startTick,
            clip.durationTicks,
            clip.color,
            clip.name,
            undefined,
            clip.notes,
            clip.startOffset,
          );
        wc._nextClipId = snap.nextId;
      },
    );
    undoStore.timeline = undo;
    redoStore.timeline = redo;
    return () => {
      undoStore.timeline = null;
      redoStore.timeline = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMidi = useCallback(() => {
    const wc = elRef.current;
    if (!wc) return;
    const clipId = wc.selectedClipId;
    if (clipId === null) {
      useMidiStore.getState().clear();
      return;
    }
    const clip = useClipsStore.getState().clips.find((c) => c.id === clipId);
    if (clip) {
      useMidiStore.getState().loadForClip(clipId, clip.notes);
    }
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const h = handlersRef.current;
    const openPianoRoll = open;

    const trackIdAt = (index: number): string =>
      tracksRef.current[index]?.id ?? "";

    const onTimelineClick = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const wc = elRef.current;
      if (!wc) return;
      const trackId = trackIdAt(d.trackIndex);
      if (!trackId) return;
      useUndoStore.getState().executeAction("timeline", () => ({
        clips: wc.getClips(),
        nextId: wc._nextClipId,
      }));
      const wcId = wc.addClip(
        d.trackIndex,
        d.tick,
        96,
        "#22d3ee",
        "Clip",
        undefined,
        [],
        0,
      );
      h.addClip(
        {
          trackId,
          trackIndex: d.trackIndex,
          startTick: d.tick,
          durationTicks: 96,
          color: "#22d3ee",
          name: "Clip",
          notes: [],
          startOffset: 0,
        },
        wcId,
      );
    };

    const onBeforeClipAction = (e: Event) => {
      const d = (e as CustomEvent).detail;
      useUndoStore.getState().executeAction("timeline", () => d);
    };

    const onClipMove = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const trackId = trackIdAt(d.trackIndex);
      h.moveClip(d.clipId, d.startTick, d.trackIndex, trackId);
    };

    const onClipResize = (e: Event) => {
      const d = (e as CustomEvent).detail;
      h.resizeClip(d.clipId, d.startTick, d.durationTicks);
    };

    const onClipTrim = (e: Event) => {
      const d = (e as CustomEvent).detail;
      h.trimClip(d.clipId, d.startOffset, d.durationTicks);
    };

    const onClipDelete = (e: Event) => {
      const d = (e as CustomEvent).detail;
      h.removeClip(d.clipId);
    };

    const onClipSelect = () => {
      loadMidi();
    };

    const onClipDblClick = () => {
      openPianoRoll("piano-roll");
    };

    el.addEventListener("before-clip-action", onBeforeClipAction);
    el.addEventListener("timeline-click", onTimelineClick);
    el.addEventListener("clip-move", onClipMove);
    el.addEventListener("clip-resize", onClipResize);
    el.addEventListener("clip-trim", onClipTrim);
    el.addEventListener("clip-delete", onClipDelete);
    el.addEventListener("clip-select", onClipSelect);
    el.addEventListener("clip-dblclick", onClipDblClick);
    return () => {
      el.removeEventListener("before-clip-action", onBeforeClipAction);
      el.removeEventListener("timeline-click", onTimelineClick);
      el.removeEventListener("clip-move", onClipMove);
      el.removeEventListener("clip-resize", onClipResize);
      el.removeEventListener("clip-trim", onClipTrim);
      el.removeEventListener("clip-delete", onClipDelete);
      el.removeEventListener("clip-select", onClipSelect);
      el.removeEventListener("clip-dblclick", onClipDblClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createElement("daw-timeline", {
    ref: elRef,
    style: { width: "100%", height: "100%", display: "block" },
  });
});
