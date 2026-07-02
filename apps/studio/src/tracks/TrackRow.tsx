import { memo, useState, useRef, useEffect } from "react";
import { Fader } from "../shared/components/Fader";
import { Knob } from "../shared/components/Knob";

const COLORS = [
  "#22d3ee",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
  "#3b82f6",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

export const TrackRow = memo(function TrackRow({
  track,
  selectedId,
  mute,
  solo,
  volume,
  pan,
  presetName,
  presetIcon,
  onSelect,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onPanChange,
  onColorChange,
}: {
  track: { id: string; name: string; color: string; presetId?: string };
  selectedId: string | null;
  mute: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  presetName?: string;
  presetIcon?: string;
  onSelect: (id: string) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onVolumeChange: (id: string, v: number) => void;
  onPanChange: (id: string, v: number) => void;
  onColorChange?: (id: string, color: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const isSelected = track.id === selectedId;
  const vol127 = Math.round(volume * 127);
  const panVal = Math.round(((pan + 1) / 2) * 127);
  return (
    <div
      className={`flex items-center gap-1.5 h-11 px-3 border-b border-border cursor-pointer transition-colors text-[11px] ${
        isSelected
          ? "bg-accent-bg/30 border-l-2 border-l-accent"
          : "hover:bg-surface-hover border-l-2 border-l-transparent"
      }`}
      onClick={() => onSelect(track.id)}
    >
      <div className="relative">
        <div
          className="w-3 h-3 rounded-full shrink-0 cursor-pointer border border-[#555]"
          style={{ backgroundColor: track.color ?? "#22d3ee" }}
          onClick={(e) => {
            e.stopPropagation();
            setShowPicker(!showPicker);
          }}
        />
        {showPicker && (
          <div
            ref={pickerRef}
            className="absolute top-4 left-0 z-50 p-1 bg-[#2a2a2a] border border-[#555] rounded shadow-lg grid grid-cols-5 gap-0.5"
            style={{ width: 90 }}
          >
            {COLORS.map((c) => (
              <div
                key={c}
                className="w-3.5 h-3.5 rounded-full cursor-pointer hover:scale-125 transition-transform"
                style={{ backgroundColor: c }}
                onClick={(e) => {
                  e.stopPropagation();
                  onColorChange?.(track.id, c);
                  setShowPicker(false);
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-text-dim text-[10px]">{track.name}</div>
        <div className="flex items-center gap-0.5 text-[9px] text-text-muted">
          {presetIcon && <span>{presetIcon}</span>}
          <span className="truncate">{presetName ?? "Synth"}</span>
        </div>
      </div>
      <button
        className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center transition-colors ${
          mute
            ? "bg-danger text-white"
            : "bg-surface-hover text-text-muted hover:bg-border"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute(track.id);
        }}
        title={mute ? "Unmute" : "Mute"}
      >
        M
      </button>
      <button
        className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center transition-colors ${
          solo
            ? "bg-warning text-white"
            : "bg-surface-hover text-text-muted hover:bg-border"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSolo(track.id);
        }}
        title={solo ? "Unsolo" : "Solo"}
      >
        S
      </button>
      <Fader
        value={vol127}
        min={0}
        max={127}
        width={6}
        height={24}
        label={`${track.name} Volume`}
        onChange={(v) => onVolumeChange(track.id, v / 127)}
      />
      <span
        className="w-7 text-right text-text-muted text-[10px]"
        title={`Volume: ${Math.round(volume * 100)}%`}
      >
        {Math.round(volume * 100)}
      </span>
      <Knob
        value={panVal}
        min={0}
        max={127}
        size={18}
        label={`${track.name} Pan`}
        onChange={(v) => onPanChange(track.id, (v / 127) * 2 - 1)}
      />
    </div>
  );
});
