import { useState, useRef, useEffect } from "react";
import { useTransportStore } from "@kaeldaw/project/useTransportStore";

function formatPosition(
  position: number,
  ppqn: number,
  beatsPerBar: number,
): string {
  const ticksPerBar = ppqn * beatsPerBar;
  const bar = Math.floor(position / ticksPerBar) + 1;
  const beat = Math.floor((position % ticksPerBar) / ppqn) + 1;
  const tick = position % ppqn;
  const pad = (n: number, d: number) => String(n).padStart(d, "0");
  return `${pad(bar, 3)}:${pad(beat, 2)}:${pad(tick, 3)}`;
}

function EditableBpm({
  bpm,
  setBpm,
}: {
  bpm: number;
  setBpm: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(bpm));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setValue(String(bpm));
  }, [bpm, editing]);

  const commit = () => {
    const n = Number(value);
    if (!isNaN(n) && n >= 20 && n <= 300) setBpm(n);
    else setValue(String(bpm));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-14 bg-black text-cyan-400 text-xs font-mono text-center outline-none border border-cyan-500 rounded px-1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(String(bpm));
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <span
      className="text-xs text-gray-300 cursor-pointer hover:text-white border-b border-dotted border-gray-600"
      onClick={() => {
        setValue(String(bpm));
        setEditing(true);
      }}
      title="Click to edit BPM"
    >
      {bpm} BPM
    </span>
  );
}

function EditableTimeSig({
  beats,
  beatValue,
  setTimeSignature,
}: {
  beats: number;
  beatValue: number;
  setTimeSignature: (b: number, bv: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(`${beats}/${beatValue}`);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setValue(`${beats}/${beatValue}`);
  }, [beats, beatValue, editing]);

  const commit = () => {
    const m = value.match(/^(\d+)\/(\d+)$/);
    if (m) setTimeSignature(Number(m[1]), Number(m[2]));
    else setValue(`${beats}/${beatValue}`);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-14 bg-black text-cyan-400 text-xs font-mono text-center outline-none border border-cyan-500 rounded px-1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(`${beats}/${beatValue}`);
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <span
      className="text-xs text-gray-300 cursor-pointer hover:text-white border-b border-dotted border-gray-600"
      onClick={() => {
        setValue(`${beats}/${beatValue}`);
        setEditing(true);
      }}
      title="Click to edit time signature"
    >
      {beats}/{beatValue}
    </span>
  );
}

export function TransportPanel() {
  const state = useTransportStore((s) => s.state);
  const bpm = useTransportStore((s) => s.bpm);
  const position = useTransportStore((s) => s.position);
  const ppqn = useTransportStore((s) => s.ppqn);
  const ts = useTransportStore((s) => s.timeSignature);
  const play = useTransportStore((s) => s.play);
  const pause = useTransportStore((s) => s.pause);
  const stop = useTransportStore((s) => s.stop);
  const setBpm = useTransportStore((s) => s.setBpm);
  const setTimeSignature = useTransportStore((s) => s.setTimeSignature);

  const PlayingIcon = "\u23F8";
  const StoppedIcon = "\u25B6";
  const isPlaying = state === "playing";

  return (
    <div className="flex items-center gap-4 h-14 bg-[#1a1b26] border-b border-gray-800 text-sm font-mono select-none">
      <button
        data-testid="play-btn"
        className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded text-white text-base"
        onClick={() => {
          if (isPlaying) pause();
          else play();
        }}
        title={isPlaying ? "Pause (playing)" : "Play (stopped)"}
      >
        {isPlaying ? PlayingIcon : StoppedIcon}
      </button>
      <button
        data-testid="stop-btn"
        className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded text-gray-400 text-base"
        onClick={stop}
        title="Stop (reset position)"
      >
        {"\u23F9"}
      </button>
      <div className="h-8 w-px bg-gray-700" />
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
        Pos
      </span>
      <div
        data-testid="position-display"
        className="bg-black px-3 py-1 rounded font-mono text-cyan-400 text-xs tracking-widest"
        title="Bars:Beats:Ticks"
      >
        {formatPosition(position, ppqn, ts.beats)}
      </div>
      <div className="flex-1" />
      <EditableBpm bpm={bpm} setBpm={setBpm} />
      <span className="text-[10px] text-gray-500">{state}</span>
      <span className="text-gray-600">|</span>
      <EditableTimeSig
        beats={ts.beats}
        beatValue={ts.beatValue}
        setTimeSignature={setTimeSignature}
      />
    </div>
  );
}
