import { memo } from "react";
import { Fader } from "../shared/Fader";
import { Knob } from "../shared/Knob";

export const TrackRow = memo(function TrackRow({ track, selectedId, mute, solo, volume, pan,
  onSelect, onToggleMute, onToggleSolo, onVolumeChange, onPanChange }: {
  track: { id: string; name: string };
  selectedId: string | null;
  mute: boolean; solo: boolean; volume: number; pan: number;
  onSelect: (id: string) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onVolumeChange: (id: string, v: number) => void;
  onPanChange: (id: string, v: number) => void;
}) {
  const isSelected = track.id === selectedId;
  const vol127 = Math.round(volume * 127);
  const panVal = Math.round(((pan + 1) / 2) * 127);
  return (
    <div
      className={`flex items-center gap-1 h-12 px-2 border-b border-gray-800 cursor-pointer transition-colors text-[10px] ${
        isSelected ? "bg-[#1e1f2e]" : "hover:bg-[#1a1b26]"
      }`}
      onClick={() => onSelect(track.id)}
    >
      <div className="w-20 truncate text-gray-400">{track.name}</div>
      <button
        className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center transition-colors ${
          mute ? "bg-red-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
        }`}
        onClick={(e) => { e.stopPropagation(); onToggleMute(track.id); }}
        title={mute ? "Unmute" : "Mute"}
      >M</button>
      <button
        className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center transition-colors ${
          solo ? "bg-yellow-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
        }`}
        onClick={(e) => { e.stopPropagation(); onToggleSolo(track.id); }}
        title={solo ? "Unsolo" : "Solo"}
      >S</button>
      <Fader value={vol127} min={0} max={127} width={6} height={24} label={track.name}
        onChange={(v) => onVolumeChange(track.id, v / 127)} />
      <span className="w-8 text-right text-gray-500">{Math.round(volume * 100)}</span>
      <Knob value={panVal} min={0} max={127} size={20} label={`${track.name} Pan`}
        onChange={(v) => onPanChange(track.id, (v / 127) * 2 - 1)} />
    </div>
  );
});
