import { useRef, useEffect, createElement, useCallback, useState, memo, type MutableRefObject } from "react";
import { useTracksStore } from "@kaeldaw/project/useTracksStore";
import { useMixerStore } from "@kaeldaw/project/useMixerStore";
import { useProjectStore } from "@kaeldaw/project/useProjectStore";
import { useTransportStore } from "@kaeldaw/project/useTransportStore";
import { useClipsStore } from "@kaeldaw/project/useClipsStore";
import { useMidiStore } from "@kaeldaw/project/useMidiStore";
import { useUndoStore, type UndoContext } from "@kaeldaw/project/useUndoStore";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { Transport } from "@kaeldaw/audio-engine/Transport";
import { saveProjectFile, loadProjectFile } from "@kaeldaw/project/save-load";
import { createDownloadLink, revokeDownloadLink } from "@kaeldaw/project/wav-export";
import { renderProject } from "./export/renderProject";
import type { ExportProgress } from "./export/renderProject";
import { WindowManagerProvider, useWindowManager } from "./stores/WindowManager";
import { TopBar } from "./layout/TopBar";
import { TrackList } from "./tracks/TrackList";
import { MixerPanel } from "./mixer/MixerPanel";
import { FloatingWindow } from "./components/FloatingWindow";
import { Sidebar } from "./instruments/Sidebar";
import { instrumentManager } from "./stores/useInstrumentStore";

const WINDOW_TO_CTX: Record<string, UndoContext> = {
  "timeline": "timeline",
  "piano-roll": "pianoRoll",
  "mixer": "mixer",
  "tracks": "tracks",
};

const TICKS_PER_BEAT_VISUAL = 24;
const VISUAL_TO_PPQN = Transport.ppqn / TICKS_PER_BEAT_VISUAL;
const PPQN_TO_VISUAL = TICKS_PER_BEAT_VISUAL / Transport.ppqn;

type UndoFn = () => void;

const TimelineWindow = memo(function TimelineWindow({ undoRefs, redoRefs }: { undoRefs: MutableRefObject<Record<UndoContext, UndoFn | null>>; redoRefs: MutableRefObject<Record<UndoContext, UndoFn | null>> }) {
  const tracks = useTracksStore((s) => s.tracks);
  const position = useTransportStore((s) => s.position);
  const clips = useClipsStore((s) => s.clips);
  const addClip = useClipsStore((s) => s.addClip);
  const moveClip = useClipsStore((s) => s.moveClip);
  const resizeClip = useClipsStore((s) => s.resizeClip);
  const trimClip = useClipsStore((s) => s.trimClip);
  const removeClip = useClipsStore((s) => s.removeClip);
  const { open } = useWindowManager();
  const elRef = useRef<HTMLElement>(null);

  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    (el as any).numTracks = tracks.length;
  }, [tracks.length]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    (el as any).playheadTick = position * PPQN_TO_VISUAL;
  }, [position]);

  const version = useClipsStore((s) => s.version);
  useEffect(() => {
    const wc = elRef.current as any;
    if (!wc) return;
    wc.clearClips();
    let maxId = 0;
    for (const clip of clips) {
      const notes = clip.notes.map((n) => ({ note: n.note, startTick: n.startTick, durationTicks: n.durationTicks }));
      wc.addClip(clip.trackIndex, clip.startTick, clip.durationTicks, clip.color, clip.name, clip.id, notes, clip.startOffset);
      if (clip.id > maxId) maxId = clip.id;
    }
    (wc as any)._nextClipId = maxId + 1;
  }, [version]);

  const handlersRef = useRef({ addClip, moveClip, resizeClip, trimClip, removeClip });
  useEffect(() => { handlersRef.current = { addClip, moveClip, resizeClip, trimClip, removeClip }; }, [addClip, moveClip, resizeClip, trimClip, removeClip]);

  // Register undo/redo for this context
  useEffect(() => {
    undoRefs.current.timeline = () => {
      console.log("UNDO TIMELINE CALLED");
      const wc = elRef.current as any;
      if (!wc) { console.log("UNDO TIMELINE: wc null"); return; }
      const before = wc.getClips().map((c: any) => ({ id: c.id, pos: c.startTick }));
      console.log("UNDO TIMELINE: WC clips before restore:", JSON.stringify(before));
      const snap = useUndoStore.getState().undo("timeline", () => ({
        clips: wc.getClips(),
        nextId: (wc as any)._nextClipId,
      }));
      if (!snap) { console.log("UNDO TIMELINE: no snapshot"); return; }
      const s = snap as { clips: any[]; nextId: number };
      console.log("UNDO TIMELINE: restoring snapshot clips:", JSON.stringify(s.clips.map(c => ({ id: c.id, pos: c.startTick }))));
      wc.clearClips();
      for (const clip of s.clips) {
        const notes = (clip.notes || []).map((n: any) => ({ note: n.note, startTick: n.startTick, durationTicks: n.durationTicks }));
        wc.addClip(clip.trackIndex, clip.startTick, clip.durationTicks, clip.color, clip.name, undefined, notes, clip.startOffset ?? 0);
      }
      (wc as any)._nextClipId = s.nextId;
      const after = wc.getClips().map((c: any) => ({ id: c.id, pos: c.startTick }));
      console.log("UNDO TIMELINE: WC clips after restore:", JSON.stringify(after));
    };
    redoRefs.current.timeline = () => {
      const wc = elRef.current as any;
      if (!wc) return;
      const snap = useUndoStore.getState().redo("timeline", () => ({
        clips: wc.getClips(),
        nextId: (wc as any)._nextClipId,
      }));
      if (!snap) return;
      const s = snap as { clips: any[]; nextId: number };
      wc.clearClips();
      for (const clip of s.clips) {
        const notes = (clip.notes || []).map((n: any) => ({ note: n.note, startTick: n.startTick, durationTicks: n.durationTicks }));
        wc.addClip(clip.trackIndex, clip.startTick, clip.durationTicks, clip.color, clip.name, undefined, notes, clip.startOffset ?? 0);
      }
      (wc as any)._nextClipId = s.nextId;
    };
    return () => { undoRefs.current.timeline = null; redoRefs.current.timeline = null; };
  }, []);

  const loadMidi = useCallback(() => {
    const wc = elRef.current as any;
    if (!wc) return;
    const clipId = (wc as any).selectedClipId;
    if (clipId === null) { useMidiStore.getState().clear(); return; }
    const clip = useClipsStore.getState().clips.find((c) => c.id === clipId);
    if (clip) {
      useMidiStore.getState().loadForClip(clipId, clip.notes);
    }
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const trackIdAt = (index: number): string =>
      tracksRef.current[index]?.id ?? "";

    const onTimelineClick = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const wc = elRef.current as any;
      if (!wc) return;
      const trackId = trackIdAt(d.trackIndex);
      if (!trackId) return;
      useUndoStore.getState().executeAction("timeline", () => ({
        clips: wc.getClips(),
        nextId: (wc as any)._nextClipId,
      }));
      const wcId = wc.addClip(d.trackIndex, d.tick, 96, "#22d3ee", "Clip", undefined, [], 0);
      handlersRef.current.addClip({ trackId, trackIndex: d.trackIndex, startTick: d.tick, durationTicks: 96, color: "#22d3ee", name: "Clip", notes: [], startOffset: 0 }, wcId);
    };

    const onBeforeClipAction = (e: Event) => {
      const d = (e as CustomEvent).detail;
      useUndoStore.getState().executeAction("timeline", () => d);
    };

    const onClipMove = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const trackId = trackIdAt(d.trackIndex);
      handlersRef.current.moveClip(d.clipId, d.startTick, d.trackIndex, trackId);
    };

    const onClipResize = (e: Event) => {
      const d = (e as CustomEvent).detail;
      handlersRef.current.resizeClip(d.clipId, d.startTick, d.durationTicks);
    };

    const onClipTrim = (e: Event) => {
      const d = (e as CustomEvent).detail;
      handlersRef.current.trimClip(d.clipId, d.startOffset, d.durationTicks);
    };

    const onClipDelete = (e: Event) => {
      const d = (e as CustomEvent).detail;
      handlersRef.current.removeClip(d.clipId);
    };

    const onClipSelect = (_: Event) => {
      loadMidi();
    };

    const onClipDblClick = (_: Event) => {
      open("piano-roll");
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
  }, []);

  // eslint-disable-next-line react-hooks/refs
  return createElement("daw-timeline", {
    ref: elRef,
    style: { width: "100%", height: "100%", display: "block" },
  });
});

const PianoRollWindow = memo(function PianoRollWindow({ undoRefs, redoRefs }: { undoRefs: MutableRefObject<Record<UndoContext, UndoFn | null>>; redoRefs: MutableRefObject<Record<UndoContext, UndoFn | null>> }) {
  const position = useTransportStore((s) => s.position);
  const notes = useMidiStore((s) => s.notes);
  const clipId = useMidiStore((s) => s.clipId);
  const addNote = useMidiStore((s) => s.addNote);
  const moveNote = useMidiStore((s) => s.moveNote);
  const resizeNote = useMidiStore((s) => s.resizeNote);
  const removeNote = useMidiStore((s) => s.removeNote);
  const elRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    (el as any).playheadTick = position * PPQN_TO_VISUAL;
  }, [position]);

  useEffect(() => {
    const wc = elRef.current as any;
    if (!wc || clipId === null) return;
    wc.clearNotes();
    for (const note of notes) {
      wc.addNote(note.note, note.startTick, note.durationTicks, note.velocity, note.color, note.id);
    }
  }, [clipId, notes]);

  const handlersRef = useRef({ addNote, moveNote, resizeNote, removeNote });
  useEffect(() => { handlersRef.current = { addNote, moveNote, resizeNote, removeNote }; }, [addNote, moveNote, resizeNote, removeNote]);

  // Register undo/redo for this context
  useEffect(() => {
    undoRefs.current.pianoRoll = () => {
      const wc = elRef.current as any;
      if (!wc) return;
      const snap = useUndoStore.getState().undo("pianoRoll", () => ({
        notes: wc.getNotes(),
        clipId: useMidiStore.getState().clipId,
      }));
      if (!snap) return;
      const s = snap as { notes: any[]; clipId: number | null };
      wc.clearNotes();
      for (const n of s.notes) wc.addNote(n.note, n.startTick, n.durationTicks, n.velocity, n.color, n.id);
      if (s.clipId !== null) {
        useMidiStore.setState({ clipId: s.clipId, notes: s.notes.map((n) => ({ ...n })) });
        useMidiStore.getState().syncToClips();
      }
    };
    redoRefs.current.pianoRoll = () => {
      const wc = elRef.current as any;
      if (!wc) return;
      const snap = useUndoStore.getState().redo("pianoRoll", () => ({
        notes: wc.getNotes(),
        clipId: (wc as any).clipId ?? useMidiStore.getState().clipId,
      }));
      if (!snap) return;
      const s = snap as { notes: any[]; clipId: number | null };
      if (s.clipId !== null) {
        wc.clearNotes();
        for (const n of s.notes) wc.addNote(n.note, n.startTick, n.durationTicks, n.velocity, n.color, n.id);
        useMidiStore.setState({ clipId: s.clipId, notes: s.notes });
        useMidiStore.getState().syncToClips();
      }
    };
    return () => { undoRefs.current.pianoRoll = null; redoRefs.current.pianoRoll = null; };
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

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
      addNote({ note: d.note, startTick: d.startTick, durationTicks: d.durationTicks, velocity: 100, color: "#22d3ee" }, d.noteId);
      sync();
    };

    const onNoteMove = (e: Event) => {
      const d = (e as CustomEvent).detail;
      handlersRef.current.moveNote(d.noteId, d.note, d.startTick);
      sync();
    };

    const onNoteResize = (e: Event) => {
      const d = (e as CustomEvent).detail;
      handlersRef.current.resizeNote(d.noteId, d.startTick, d.durationTicks);
      sync();
    };

    const onNoteDelete = (e: Event) => {
      const d = (e as CustomEvent).detail;
      handlersRef.current.removeNote(d.noteId);
      sync();
    };

    el.addEventListener("before-note-action", onBeforeNoteAction);
    el.addEventListener("note-add", onNoteAdd);
    el.addEventListener("note-move", onNoteMove);
    el.addEventListener("note-resize", onNoteResize);
    el.addEventListener("note-delete", onNoteDelete);
    return () => {
      el.removeEventListener("before-note-action", onBeforeNoteAction);
      el.removeEventListener("note-add", onNoteAdd);
      el.removeEventListener("note-move", onNoteMove);
      el.removeEventListener("note-resize", onNoteResize);
      el.removeEventListener("note-delete", onNoteDelete);
    };
  }, []);

  // eslint-disable-next-line react-hooks/refs
  return createElement("daw-piano-roll", {
    ref: elRef,
    style: { width: "100%", height: "100%", display: "block" },
  });
});

function WaveformWindow() {
  const elRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const el = elRef.current as any;
      if (el) {
        const samples = PolySynthOutput.getWaveformSamples();
        if (samples) el.samples = samples;
      }
      setTimeout(tick, 80);
    };
    tick();
    return () => { cancelled = true; };
  }, []);

  return createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        padding: 8,
        background: "#353535",
      },
    },
    // eslint-disable-next-line react-hooks/refs
    createElement("daw-waveform", {
      ref: elRef,
      style: { width: "100%", height: "100%", display: "block" },
    }),
  );
}

function AppInner() {
  const tracks = useTracksStore((s) => s.tracks);
  const addTrack = useTracksStore((s) => s.addTrack);
  const selectTrack = useTracksStore((s) => s.selectTrack);
  const selectedId = useTracksStore((s) => s.selectedId);
  const channels = useMixerStore((s) => s.channels);
  const addChannel = useMixerStore((s) => s.addChannel);
  const toggleMute = useMixerStore((s) => s.toggleMute);
  const toggleSolo = useMixerStore((s) => s.toggleSolo);
  const setVolume = useMixerStore((s) => s.setVolume);
  const setPan = useMixerStore((s) => s.setPan);
  const masterVolume = useMixerStore((s) => s.masterVolume);
  const masterMeterLevel = useMixerStore((s) => s.masterMeterLevel);
  const setMasterVolume = useMixerStore((s) => s.setMasterVolume);
  const projectName = useProjectStore((s) => s.name);
  const setName = useProjectStore((s) => s.setName);

  const channelMap = new Map(channels.map((c) => [c.id, c]));

  const setFocusedContext = useUndoStore((s) => s.setFocusedContext);

  // Refs for per-context undo/redo functions registered by child components
  const undoFnsRef = useRef<Record<UndoContext, UndoFn | null>>({ timeline: null, pianoRoll: null, mixer: null, tracks: null });
  const redoFnsRef = useRef<Record<UndoContext, UndoFn | null>>({ timeline: null, pianoRoll: null, mixer: null, tracks: null });

  // Register mixer and tracks undo/redo (these live in AppInner scope)
  undoFnsRef.current.mixer = () => {
    const state = useMixerStore.getState();
    const snap = useUndoStore.getState().undo("mixer", () => ({
      channels: state.channels.map((ch) => ({ ...ch })),
      masterVolume: state.masterVolume,
    }));
    if (snap) {
      const s = snap as { channels: any[]; masterVolume: number };
      useMixerStore.setState({ channels: s.channels, masterVolume: s.masterVolume ?? 1 });
    }
  };
  redoFnsRef.current.mixer = () => {
    const state = useMixerStore.getState();
    const snap = useUndoStore.getState().redo("mixer", () => ({
      channels: state.channels.map((ch) => ({ ...ch })),
      masterVolume: state.masterVolume,
    }));
    if (snap) {
      const s = snap as { channels: any[]; masterVolume: number };
      useMixerStore.setState({ channels: s.channels, masterVolume: s.masterVolume ?? 1 });
    }
  };
  undoFnsRef.current.tracks = () => {
    const state = useTracksStore.getState();
    const snap = useUndoStore.getState().undo("tracks", () => ({
      tracks: state.tracks.map((t) => ({ id: t.id, name: t.name })),
    }));
    if (snap) {
      const s = snap as { tracks: { id: string; name: string }[] };
      useTracksStore.setState({ tracks: s.tracks, selectedId: useTracksStore.getState().selectedId });
    }
  };
  redoFnsRef.current.tracks = () => {
    const state = useTracksStore.getState();
    const snap = useUndoStore.getState().redo("tracks", () => ({
      tracks: state.tracks.map((t) => ({ id: t.id, name: t.name })),
    }));
    if (snap) {
      const s = snap as { tracks: { id: string; name: string }[] };
      useTracksStore.setState({ tracks: s.tracks, selectedId: useTracksStore.getState().selectedId });
    }
  };

  const handleUndo = useCallback(() => {
    const ctx = useUndoStore.getState().focusedContext;
    if (ctx) undoFnsRef.current[ctx]?.();
  }, []);

  const handleRedo = useCallback(() => {
    const ctx = useUndoStore.getState().focusedContext;
    if (ctx) redoFnsRef.current[ctx]?.();
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z") { e.preventDefault(); console.log("CTRL+Z pressed, focusedContext:", useUndoStore.getState().focusedContext); handleUndo(); }
      if (e.key === "y") { e.preventDefault(); console.log("CTRL+Y pressed, focusedContext:", useUndoStore.getState().focusedContext); handleRedo(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo, handleRedo]);

  const mixerExec = useCallback((action: () => void) => {
    const state = useMixerStore.getState();
    useUndoStore.getState().executeAction("mixer", () => ({
      channels: state.channels.map((ch) => ({ ...ch })),
      masterVolume: state.masterVolume,
    }));
    action();
  }, []);

  const tracksExec = useCallback((action: () => void) => {
    const state = useTracksStore.getState();
    useUndoStore.getState().executeAction("tracks", () => ({
      tracks: state.tracks.map((t) => ({ id: t.id, name: t.name })),
    }));
    action();
  }, []);

  // Bridge metronome store → PolySynthOutput worklet
  const metronomeEnabled = useTransportStore((s) => s.metronomeEnabled);
  useEffect(() => {
    PolySynthOutput.setMetronome(metronomeEnabled, 960, useTransportStore.getState().timeSignature.beats);
  }, [metronomeEnabled]);

  // Wire PolySynthOutput to mixer store while playing + MIDI scheduler
  const setMeterLevel = useMixerStore((s) => s.setMeterLevel);
  const setMasterMeterLevel = useMixerStore((s) => s.setMasterMeterLevel);
  const transportState = useTransportStore((s) => s.state);

  useEffect(() => {
    let cancelled = false;

    if (transportState === "playing") {
      PolySynthOutput.onLevel = (level: number) => {
        for (const ch of useMixerStore.getState().channels) {
          setMeterLevel(ch.id, level);
        }
        setMasterMeterLevel(level);
      };

      (async () => {
        try {
          await PolySynthOutput.start();
          PolySynthOutput.setConfig(instrumentManager.getSelectedConfig());
        } catch (err) {
          console.error("PolySynthOutput.start() failed:", err);
          return;
        }
        if (cancelled) return;

        const clips = useClipsStore.getState().clips;
        const events: { tick: number; type: string; note: number; velocity: number }[] = [];
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
              events.push({ tick: clampedStart * VISUAL_TO_PPQN, type: "on", note: n.note, velocity: n.velocity });
              events.push({ tick: clampedEnd * VISUAL_TO_PPQN, type: "off", note: n.note, velocity: 0 });
            }
          }
        }

        PolySynthOutput.startScheduled(events, Transport.bpm, Transport.ppqn, Transport.position);
      })();

      return () => {
        cancelled = true;
        PolySynthOutput.allNotesOff();
        PolySynthOutput.stop();
        for (const ch of useMixerStore.getState().channels) {
          setMeterLevel(ch.id, 0);
        }
        setMasterMeterLevel(0);
      };
    } else {
      PolySynthOutput.allNotesOff();
      PolySynthOutput.stop();
      for (const ch of useMixerStore.getState().channels) {
        setMeterLevel(ch.id, 0);
      }
      setMasterMeterLevel(0);
    }

    return () => {
      cancelled = true;
    };
  }, [transportState, setMeterLevel, setMasterMeterLevel]);

  const handleAddTrack = () => {
    tracksExec(() => {
      const name = `Track ${tracks.length + 1}`;
      addTrack(name);
      const newTrack = useTracksStore.getState().tracks.at(-1);
      if (newTrack) addChannel(newTrack.name, newTrack.id);
    });
  };

  const handleVolumeChange = useCallback((id: string, v: number) => {
    mixerExec(() => setVolume(id, v));
  }, [setVolume]);

  const handlePanChange = useCallback((id: string, v: number) => {
    mixerExec(() => setPan(id, v));
  }, [setPan]);

  const handleToggleMute = useCallback((id: string) => {
    mixerExec(() => toggleMute(id));
  }, [toggleMute]);

  const handleToggleSolo = useCallback((id: string) => {
    mixerExec(() => toggleSolo(id));
  }, [toggleSolo]);

  const handleSetMasterVolume = useCallback((v: number) => {
    mixerExec(() => setMasterVolume(v));
  }, [setMasterVolume]);

  const [delayEnabled, setDelayEnabled] = useState(false);
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const toggleDelay = () => {
    const next = !delayEnabled;
    setDelayEnabled(next);
    PolySynthOutput.setDelayEnabled(next);
  };
  const toggleReverb = () => {
    const next = !reverbEnabled;
    setReverbEnabled(next);
    PolySynthOutput.setReverbEnabled(next);
  };

  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  const handleExport = async () => {
    setExportProgress({ percent: 0, stage: "Starting..." });
    try {
      const result = await renderProject(44100, (p) => setExportProgress({ ...p }));
      if (result.master) {
        const a = createDownloadLink(result.master, `${projectName}.wav`);
        a.click();
        revokeDownloadLink(a);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExportProgress(null);
    }
  };

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("kaeldaw-sidebar-width");
    return saved ? Number(saved) : 200;
  });
  const handleSidebarResize = (w: number) => {
    setSidebarWidth(w);
    localStorage.setItem("kaeldaw-sidebar-width", String(w));
  };

  return (
    <div className="h-screen bg-[#2a2a2a] text-[#ccc] text-sm select-none flex flex-col overflow-hidden">
      <TopBar projectName={projectName} onSetName={setName}
        onSave={saveProjectFile} onLoad={loadProjectFile} onExport={handleExport}
        onUndo={handleUndo} onRedo={handleRedo} />

      {/* Content: Sidebar + Floating windows */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar width={sidebarWidth} onResize={handleSidebarResize} />

        {/* Floating windows layer */}
        <div className="flex-1 relative overflow-hidden">
          <FloatingWindow id="timeline" sidebarWidth={sidebarWidth} onFocus={(id) => { const ctx = WINDOW_TO_CTX[id]; if (ctx) setFocusedContext(ctx); }}>
          <TimelineWindow undoRefs={undoFnsRef} redoRefs={redoFnsRef} />
        </FloatingWindow>

        <FloatingWindow id="piano-roll" sidebarWidth={sidebarWidth} onFocus={(id) => { const ctx = WINDOW_TO_CTX[id]; if (ctx) setFocusedContext(ctx); }}>
          <PianoRollWindow undoRefs={undoFnsRef} redoRefs={redoFnsRef} />
        </FloatingWindow>

        <FloatingWindow id="mixer" sidebarWidth={sidebarWidth} onFocus={(id) => { const ctx = WINDOW_TO_CTX[id]; if (ctx) setFocusedContext(ctx); }}>
          <MixerPanel
            channels={channels}
            masterVolume={masterVolume}
            masterMeterLevel={masterMeterLevel}
            onVolumeChange={handleVolumeChange}
            onPanChange={handlePanChange}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onSetMasterVolume={handleSetMasterVolume}
            delayEnabled={delayEnabled}
            reverbEnabled={reverbEnabled}
            onToggleDelay={toggleDelay}
            onToggleReverb={toggleReverb}
          />
        </FloatingWindow>

        <FloatingWindow id="tracks" sidebarWidth={sidebarWidth} onFocus={(id) => { const ctx = WINDOW_TO_CTX[id]; if (ctx) setFocusedContext(ctx); }}>
          <TrackList
            tracks={tracks}
            selectedId={selectedId}
            channelMap={channelMap}
            onSelect={selectTrack}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onVolumeChange={handleVolumeChange}
            onPanChange={handlePanChange}
            onAddTrack={handleAddTrack}
          />
        </FloatingWindow>

        <FloatingWindow id="waveform" sidebarWidth={sidebarWidth}>
          <WaveformWindow />
        </FloatingWindow>
      </div>
    </div>

      {exportProgress && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center">
          <div className="bg-[#3a3a3a] rounded-lg p-6 shadow-xl w-80 text-center">
            <div className="text-sm text-[#ccc] mb-3">{exportProgress.stage}</div>
            <div className="w-full h-2 bg-[#555] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3b82f6] transition-all duration-200 rounded-full"
                style={{ width: `${exportProgress.percent}%` }}
              />
            </div>
            <div className="text-xs text-[#888] mt-2">{exportProgress.percent}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <WindowManagerProvider>
      <AppInner />
    </WindowManagerProvider>
  );
}
