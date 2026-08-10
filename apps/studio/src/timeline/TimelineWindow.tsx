import {
  useRef,
  useEffect,
  createElement,
  useCallback,
  memo,
} from "react";
import type { MidiNoteData } from "@kaeldaw/project/useClipsStore";
import { useWindowManager } from "../shared/components/useWindowManager";
import { PPQN_TO_VISUAL } from "../shared/constants";
import { useCore, project } from "../stores/useCoreStore";
import { usePianoClipStore } from "../stores/usePianoClipStore";

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

export const TimelineWindow = memo(function TimelineWindow() {
  const tracks = useCore((s) => s.tracks);
  const position = useCore((s) => s.transport.position);
  const clips = useCore((s) => s.clips);
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
  }, [clips]);

  const handlersRef = useRef({
    addClip: (clip: Parameters<typeof project.addClip>[0], id?: number) =>
      project.addClip(clip, id),
    moveClip: (id: number, startTick: number, trackIndex: number, trackId?: string) =>
      project.moveClip(id, startTick, trackIndex, trackId),
    resizeClip: (id: number, startTick: number, durationTicks: number) =>
      project.resizeClip(id, startTick, durationTicks),
    trimClip: (id: number, startOffset: number, durationTicks: number) =>
      project.trimClip(id, startOffset, durationTicks),
    removeClip: (id: number) => project.removeClip(id),
  });

  const loadMidi = useCallback(() => {
    const wc = elRef.current;
    if (!wc) return;
    usePianoClipStore.getState().setClipId(wc.selectedClipId);
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

    el.addEventListener("timeline-click", onTimelineClick);
    el.addEventListener("clip-move", onClipMove);
    el.addEventListener("clip-resize", onClipResize);
    el.addEventListener("clip-trim", onClipTrim);
    el.addEventListener("clip-delete", onClipDelete);
    el.addEventListener("clip-select", onClipSelect);
    el.addEventListener("clip-dblclick", onClipDblClick);
    return () => {
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
