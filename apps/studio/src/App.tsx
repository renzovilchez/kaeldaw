import { useRef, useEffect, createElement, useCallback, useState } from "react";
import { useTracksStore } from "@kaeldaw/project/useTracksStore";
import { useMixerStore } from "@kaeldaw/project/useMixerStore";
import { useProjectStore } from "@kaeldaw/project/useProjectStore";
import { useTransportStore } from "@kaeldaw/project/useTransportStore";
import { useClipsStore } from "@kaeldaw/project/useClipsStore";
import { useMidiStore } from "@kaeldaw/project/useMidiStore";
import { useUndoStore } from "@kaeldaw/project/useUndoStore";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { AudioScheduler, type MidiEvent } from "@kaeldaw/audio-engine/AudioScheduler";
import { Transport } from "@kaeldaw/audio-engine/Transport";
import { saveProjectFile, loadProjectFile } from "@kaeldaw/project/save-load";
import { exportWav, createDownloadLink, revokeDownloadLink } from "@kaeldaw/project/wav-export";
import { WindowManagerProvider, useWindowManager } from "./stores/WindowManager";
import { TopBar } from "./layout/TopBar";
import { TrackList } from "./tracks/TrackList";
import { MixerPanel } from "./mixer/MixerPanel";
import { FloatingWindow } from "./components/FloatingWindow";
import { Sidebar } from "./instruments/Sidebar";
import { instrumentManager } from "./stores/useInstrumentStore";

const TICKS_PER_BEAT_VISUAL = 24;
const VISUAL_TO_PPQN = Transport.ppqn / TICKS_PER_BEAT_VISUAL;
const PPQN_TO_VISUAL = TICKS_PER_BEAT_VISUAL / Transport.ppqn;

function TimelineWindow() {
  const tracks = useTracksStore((s) => s.tracks);
  const position = useTransportStore((s) => s.position);
  const clips = useClipsStore((s) => s.clips);
  const addClip = useClipsStore((s) => s.addClip);
  const moveClip = useClipsStore((s) => s.moveClip);
  const resizeClip = useClipsStore((s) => s.resizeClip);
  const removeClip = useClipsStore((s) => s.removeClip);
  const { toggle } = useWindowManager();
  const elRef = useRef<HTMLElement>(null);

  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

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

  // Sync clips from store → WC when version changes (external load, not user edit)
  const version = useClipsStore((s) => s.version);
  useEffect(() => {
    const wc = elRef.current as any;
    if (!wc) return;
    wc.clearClips();
    for (const clip of clips) {
      wc.addClip(clip.trackIndex, clip.startTick, clip.durationTicks, clip.color, clip.name);
    }
  }, [version]);

  // Attach event handlers once — use refs for latest store actions + tracks
  const handlersRef = useRef({ addClip, moveClip, resizeClip, removeClip });
  handlersRef.current = { addClip, moveClip, resizeClip, removeClip };

  const loadMidiRef = useRef(() => {});
  loadMidiRef.current = () => {
    const wc = elRef.current as any;
    if (!wc) return;
    const clipId = (wc as any).selectedClipId;
    if (clipId === null) { useMidiStore.getState().clear(); return; }
    const clip = useClipsStore.getState().clips.find((c) => c.id === clipId);
    if (clip) {
      useMidiStore.getState().loadForClip(clipId, clip.notes);
    }
  };

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
      const wcId = wc.addClip(d.trackIndex, d.tick, 96, "#22d3ee", "Clip");
      handlersRef.current.addClip({ trackId, trackIndex: d.trackIndex, startTick: d.tick, durationTicks: 96, color: "#22d3ee", name: "Clip", notes: [] }, wcId);
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

    const onClipDelete = (e: Event) => {
      const d = (e as CustomEvent).detail;
      handlersRef.current.removeClip(d.clipId);
    };

    const onClipSelect = (_e: Event) => {
      loadMidiRef.current();
    };

    const onClipDblClick = (_e: Event) => {
      toggle("piano-roll");
    };

    el.addEventListener("timeline-click", onTimelineClick);
    el.addEventListener("clip-move", onClipMove);
    el.addEventListener("clip-resize", onClipResize);
    el.addEventListener("clip-delete", onClipDelete);
    el.addEventListener("clip-select", onClipSelect);
    el.addEventListener("clip-dblclick", onClipDblClick);
    return () => {
      el.removeEventListener("timeline-click", onTimelineClick);
      el.removeEventListener("clip-move", onClipMove);
      el.removeEventListener("clip-resize", onClipResize);
      el.removeEventListener("clip-delete", onClipDelete);
      el.removeEventListener("clip-select", onClipSelect);
      el.removeEventListener("clip-dblclick", onClipDblClick);
    };
  }, []);

  return createElement("daw-timeline", {
    ref: elRef,
    style: { width: "100%", height: "100%", display: "block" },
  });
}

function PianoRollWindow() {
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

  // Sync notes when selected clip changes
  useEffect(() => {
    const wc = elRef.current as any;
    if (!wc || clipId === null) return;
    wc.clearNotes();
    for (const note of notes) {
      wc.addNote(note.note, note.startTick, note.durationTicks, note.velocity, note.color, note.id);
    }
  }, [clipId]);

  // Attach event handlers once — use refs for latest store actions
  const handlersRef = useRef({ addNote, moveNote, resizeNote, removeNote });
  handlersRef.current = { addNote, moveNote, resizeNote, removeNote };

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const sync = () => useMidiStore.getState().syncToClips();

    const onNoteAdd = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const wc = elRef.current as any;
      if (!wc) return;
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

    el.addEventListener("note-add", onNoteAdd);
    el.addEventListener("note-move", onNoteMove);
    el.addEventListener("note-resize", onNoteResize);
    el.addEventListener("note-delete", onNoteDelete);
    return () => {
      el.removeEventListener("note-add", onNoteAdd);
      el.removeEventListener("note-move", onNoteMove);
      el.removeEventListener("note-resize", onNoteResize);
      el.removeEventListener("note-delete", onNoteDelete);
    };
  }, []);

  return createElement("daw-piano-roll", {
    ref: elRef,
    style: { width: "100%", height: "100%", display: "block" },
  });
}

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

  const executeAction = useUndoStore((s) => s.executeAction);
  const undo = useUndoStore((s) => s.undo);
  const redo = useUndoStore((s) => s.redo);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z") { e.preventDefault(); undo(); }
      if (e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  // Bridge metronome store → PolySynthOutput
  const metronomeEnabled = useTransportStore((s) => s.metronomeEnabled);
  useEffect(() => {
    PolySynthOutput.setMetronomeEnabled(metronomeEnabled);
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
          await PolySynthOutput.start(instrumentManager.getSelectedConfig());
        } catch (err) {
          console.error("PolySynthOutput.start() failed:", err);
          return;
        }
        if (cancelled) return;

        const clips = useClipsStore.getState().clips;
        const events: MidiEvent[] = [];
        for (const clip of clips) {
          for (const n of clip.notes) {
            events.push({ tick: (clip.startTick + n.startTick) * VISUAL_TO_PPQN, type: "on", note: n.note, velocity: n.velocity });
            events.push({ tick: (clip.startTick + n.startTick + n.durationTicks) * VISUAL_TO_PPQN, type: "off", note: n.note, velocity: 0 });
          }
        }
        events.sort((a, b) => a.tick - b.tick);

        AudioScheduler.setEvents(events);
        AudioScheduler.start(Transport.position);
      })();

      return () => {
        cancelled = true;
        AudioScheduler.stop();
        PolySynthOutput.stop();
        for (const ch of useMixerStore.getState().channels) {
          setMeterLevel(ch.id, 0);
        }
        setMasterMeterLevel(0);
      };
    } else {
      AudioScheduler.stop();
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
    executeAction("Add Track", () => {
      const name = `Track ${tracks.length + 1}`;
      addTrack(name);
      const newTrack = useTracksStore.getState().tracks.at(-1);
      if (newTrack) addChannel(newTrack.name, newTrack.id);
    });
  };

  const handleVolumeChange = useCallback((id: string, v: number) => {
    executeAction("Set Volume", () => setVolume(id, v));
  }, [executeAction, setVolume]);

  const handlePanChange = useCallback((id: string, v: number) => {
    executeAction("Set Pan", () => setPan(id, v));
  }, [executeAction, setPan]);

  const handleToggleMute = useCallback((id: string) => {
    executeAction("Toggle Mute", () => toggleMute(id));
  }, [executeAction, toggleMute]);

  const handleToggleSolo = useCallback((id: string) => {
    executeAction("Toggle Solo", () => toggleSolo(id));
  }, [executeAction, toggleSolo]);

  const handleSetMasterVolume = useCallback((v: number) => {
    executeAction("Set Master Volume", () => setMasterVolume(v));
  }, [executeAction, setMasterVolume]);

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

  const handleExport = async () => {
    const result = await exportWav({ sampleRate: 44100, bitDepth: 16 });
    if (result.master) {
      const a = createDownloadLink(result.master, `${projectName}.wav`);
      a.click();
      revokeDownloadLink(a);
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
        onUndo={undo} onRedo={redo} />

      {/* Content: Sidebar + Floating windows */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar width={sidebarWidth} onResize={handleSidebarResize} />

        {/* Floating windows layer */}
        <div className="flex-1 relative overflow-hidden">
          <FloatingWindow id="timeline" sidebarWidth={sidebarWidth}>
          <TimelineWindow />
        </FloatingWindow>

        <FloatingWindow id="piano-roll" sidebarWidth={sidebarWidth}>
          <PianoRollWindow />
        </FloatingWindow>

        <FloatingWindow id="mixer" sidebarWidth={sidebarWidth}>
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

        <FloatingWindow id="tracks" sidebarWidth={sidebarWidth}>
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
