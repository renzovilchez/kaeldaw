import { useState, useRef, memo } from "react";
import { useTransportStore } from "@kaeldaw/project/useTransportStore";
import { useUndoStore } from "@kaeldaw/project/useUndoStore";
import { useWindowManager } from "../../shared/components/useWindowManager";

const MIN_BEATS = 1;
const MAX_BEATS = 32;
const MIN_BEATVAL = 1;
const MAX_BEATVAL = 64;

const WINDOWS = [
  { id: "timeline" as const, icon: "🎹", label: "Timeline" },
  { id: "piano-roll" as const, icon: "🎼", label: "Piano Roll" },
  { id: "mixer" as const, icon: "🎚️", label: "Mixer" },
  { id: "tracks" as const, icon: "📋", label: "Tracks" },
];

function formatPosition(
  position: number,
  ppqn: number,
  beatsPerBar: number,
): string {
  const ticksPerBar = ppqn * beatsPerBar;
  const bar = Math.floor(position / ticksPerBar) + 1;
  const beat = Math.floor((position % ticksPerBar) / ppqn) + 1;
  const tick = position % ppqn;
  return `${String(bar).padStart(3, "0")}:${String(beat).padStart(2, "0")}:${String(tick).padStart(3, "0")}`;
}

const TransportControls = memo(function TransportControls() {
  const play = useTransportStore((s) => s.play);
  const pause = useTransportStore((s) => s.pause);
  const stop = useTransportStore((s) => s.stop);
  const transportState = useTransportStore((s) => s.state);
  const position = useTransportStore((s) => s.position);
  const ppqn = useTransportStore((s) => s.ppqn);
  const ts = useTransportStore((s) => s.timeSignature);
  const isPlaying = transportState === "playing";
  const metronomeEnabled = useTransportStore((s) => s.metronomeEnabled);
  const toggleMetronome = useTransportStore((s) => s.toggleMetronome);

  return (
    <>
      <button
        className="w-7 h-7 flex items-center justify-center bg-[#4a4a4a] hover:bg-[#555] active:bg-[#666] rounded text-white text-sm"
        onClick={() => {
          if (isPlaying) pause();
          else play();
        }}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>
      <button
        className="w-7 h-7 flex items-center justify-center bg-[#4a4a4a] hover:bg-[#555] active:bg-[#666] rounded text-[#999] text-sm"
        onClick={stop}
        title="Stop"
      >
        ⏹
      </button>
      <button
        className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
          metronomeEnabled
            ? "bg-[#3b82f6] text-white"
            : "bg-[#4a4a4a] hover:bg-[#555] text-[#999]"
        }`}
        onClick={toggleMetronome}
        title={metronomeEnabled ? "Metronome ON" : "Metronome OFF"}
      >
        {metronomeEnabled ? "♫" : "♪"}
      </button>
      <div
        className="bg-[#2a2a2a] px-2 py-1 rounded font-mono text-[#3b82f6] text-[11px] tracking-widest"
        title="Bars:Beats:Ticks"
      >
        {formatPosition(position, ppqn, ts.beats)}
      </div>
    </>
  );
});

const TimeSignaturePanel = memo(function TimeSignaturePanel() {
  const bpm = useTransportStore((s) => s.bpm);
  const setBpm = useTransportStore((s) => s.setBpm);
  const ts = useTransportStore((s) => s.timeSignature);
  const setTimeSignature = useTransportStore((s) => s.setTimeSignature);

  const [bpmInput, setBpmInput] = useState(String(bpm));
  const [beatsInput, setBeatsInput] = useState(String(ts.beats));
  const [beatValInput, setBeatValInput] = useState(String(ts.beatValue));

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setBpmInput(v);
    const n = Number(v);
    if (!isNaN(n) && n >= 1 && n <= 999) setBpm(n);
  };

  const handleBeatsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setBeatsInput(v);
    const n = Number(v);
    if (!isNaN(n) && n >= MIN_BEATS && n <= MAX_BEATS)
      setTimeSignature(n, ts.beatValue);
  };

  const handleBeatValChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setBeatValInput(v);
    const n = Number(v);
    if (!isNaN(n) && n >= MIN_BEATVAL && n <= MAX_BEATVAL)
      setTimeSignature(ts.beats, n);
  };

  return (
    <>
      <input
        className="bg-transparent text-xs text-[#ddd] outline-none border-b border-transparent hover:border-[#666] focus:border-[#3b82f6] focus:text-white w-12 text-center transition-colors"
        value={bpmInput}
        onChange={handleBpmChange}
        onBlur={() => setBpmInput(String(bpm))}
        title="BPM 1-999"
      />
      <span className="text-[10px] text-[#888] mr-1">BPM</span>
      <input
        className="bg-transparent text-xs text-[#ddd] outline-none border-b border-transparent hover:border-[#666] focus:border-[#3b82f6] focus:text-white w-7 text-center transition-colors"
        value={beatsInput}
        onChange={handleBeatsChange}
        onBlur={() => setBeatsInput(String(ts.beats))}
        title={`Beats ${MIN_BEATS}-${MAX_BEATS}`}
      />
      <span className="text-xs text-[#ddd]">/</span>
      <input
        className="bg-transparent text-xs text-[#ddd] outline-none border-b border-transparent hover:border-[#666] focus:border-[#3b82f6] focus:text-white w-7 text-center transition-colors mr-1"
        value={beatValInput}
        onChange={handleBeatValChange}
        onBlur={() => setBeatValInput(String(ts.beatValue))}
        title={`Beat value ${MIN_BEATVAL}-${MAX_BEATVAL}`}
      />
      <TransportStateLabel />
    </>
  );
});

const TransportStateLabel = memo(function TransportStateLabel() {
  const state = useTransportStore((s) => s.state);
  return (
    <span
      className={`text-[10px] font-semibold ${
        state === "playing"
          ? "text-[#22c55e]"
          : state === "paused"
            ? "text-[#eab308]"
            : "text-[#888]"
      }`}
    >
      {state}
    </span>
  );
});

const CONTEXT_LABEL: Record<string, string> = {
  timeline: "Timeline",
  pianoRoll: "Piano Roll",
  mixer: "Mixer",
  tracks: "Tracks",
};

const ActionButtons = memo(function ActionButtons({
  onSave,
  onLoad,
  onExport,
  onUndo,
  onRedo,
}: {
  onSave: () => void;
  onLoad: (file: File) => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const focusedContext = useUndoStore((s) => s.focusedContext);
  const canUndoMap = useUndoStore((s) => s.canUndo);
  const canRedoMap = useUndoStore((s) => s.canRedo);
  const canUndo = focusedContext ? canUndoMap[focusedContext] : false;
  const canRedo = focusedContext ? canRedoMap[focusedContext] : false;
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onLoad(file);
    e.target.value = "";
  };

  return (
    <>
      <button
        className="px-2 py-1 rounded text-[10px] bg-[#4a4a4a] hover:bg-[#555] text-white transition-colors"
        onClick={onSave}
        title="Save .kaeldaw"
      >
        💾 Save
      </button>
      <button
        className="px-2 py-1 rounded text-[10px] bg-[#4a4a4a] hover:bg-[#555] text-white transition-colors"
        onClick={() => fileRef.current?.click()}
        title="Load .kaeldaw"
      >
        📂 Load
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".kaeldaw"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="h-4 w-px bg-[#555]" />
      <button
        className={`px-2 py-1 rounded text-[10px] transition-colors ${
          canUndo
            ? "bg-[#4a4a4a] hover:bg-[#555] text-white"
            : "bg-[#333] text-[#555] cursor-default"
        }`}
        onClick={canUndo ? onUndo : undefined}
        title={
          focusedContext
            ? `Undo ${CONTEXT_LABEL[focusedContext]} (Ctrl+Z)`
            : "Undo (Ctrl+Z)"
        }
      >
        ↩{focusedContext ? ` ${CONTEXT_LABEL[focusedContext]}` : ""}
      </button>
      <button
        className={`px-2 py-1 rounded text-[10px] transition-colors ${
          canRedo
            ? "bg-[#4a4a4a] hover:bg-[#555] text-white"
            : "bg-[#333] text-[#555] cursor-default"
        }`}
        onClick={canRedo ? onRedo : undefined}
        title={
          focusedContext
            ? `Redo ${CONTEXT_LABEL[focusedContext]} (Ctrl+Y)`
            : "Redo (Ctrl+Y)"
        }
      >
        ↪{focusedContext ? ` ${CONTEXT_LABEL[focusedContext]}` : ""}
      </button>
      <button
        className="px-2 py-1 rounded text-[10px] bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-colors"
        onClick={onExport}
        title="Export WAV"
      >
        🎵 Export
      </button>
    </>
  );
});

const WindowToggles = memo(function WindowToggles() {
  const { state, toggle } = useWindowManager();

  return (
    <div className="flex items-center gap-1">
      {WINDOWS.map((win) => {
        const w = state.windows[win.id];
        const isOpen = w?.isOpen && !w?.isMinimized;
        const isMinimized = w?.isOpen && w?.isMinimized;
        const btnClass = isOpen
          ? "bg-[#3b82f6] text-white"
          : isMinimized
            ? "bg-[#555] text-white"
            : "bg-transparent text-white/70 hover:bg-[#4a4a4a] hover:text-white";
        return (
          <button
            key={win.id}
            className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 transition-colors ${btnClass}`}
            onClick={() => toggle(win.id)}
            title={`${isOpen ? "Hide" : isMinimized ? "Restore" : "Show"} ${win.label}`}
          >
            <span className="text-xs">{win.icon}</span>
            <span className="hidden sm:inline">{win.label}</span>
          </button>
        );
      })}
    </div>
  );
});

export function TopBar({
  projectName,
  onSetName,
  onSave,
  onLoad,
  onExport,
  onUndo,
  onRedo,
}: {
  projectName: string;
  onSetName: (name: string) => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="h-10 bg-[#3a3a3a] border-b border-[#555] flex items-center px-4 gap-2 shrink-0 select-none">
      <span className="text-[#3b82f6] font-bold tracking-tight text-sm mr-1">
        KaelDAW
      </span>
      <div className="h-4 w-px bg-[#555]" />
      <input
        className="bg-transparent text-xs text-[#ccc] outline-none border-b border-transparent hover:border-[#666] focus:border-[#3b82f6] focus:text-white w-28 transition-colors"
        value={projectName}
        onChange={(e) => onSetName(e.target.value)}
        title="Project name"
      />
      <div className="h-4 w-px bg-[#555] mx-1" />
      <TransportControls />
      <div className="h-4 w-px bg-[#555] mx-1" />
      <TimeSignaturePanel />
      <div className="flex-1" />
      <ActionButtons
        onSave={onSave}
        onLoad={onLoad}
        onExport={onExport}
        onUndo={onUndo}
        onRedo={onRedo}
      />
      <WindowToggles />
    </div>
  );
}
