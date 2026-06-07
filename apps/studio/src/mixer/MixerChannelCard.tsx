import { memo } from "react";
import { Fader } from "../shared/Fader";
import { Knob } from "../shared/Knob";

export const MixerChannelCard = memo(function MixerChannelCard({ label, volume, pan, mute, isMaster,
  onVolumeChange, onPanChange, onToggleMute }: {
  label: string; volume: number; pan: number; mute: boolean; isMaster?: boolean;
  onVolumeChange?: (v: number) => void;
  onPanChange?: (v: number) => void;
  onToggleMute?: () => void;
}) {
  const vol127 = Math.round(volume * 127);
  const panVal = Math.round(((pan + 1) / 2) * 127);
  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded ${isMaster ? "bg-[#1a1b2e]" : "bg-[#14151f]"} min-w-14`}>
      <span className="text-[9px] text-gray-500 truncate w-full text-center">{label}</span>
      {onVolumeChange && (
        <Fader value={vol127} min={0} max={127} width={6} height={48} label={label}
          onChange={onVolumeChange} />
      )}
      <span className="text-[9px] text-gray-600">{Math.round(volume * 100)}</span>
      {onPanChange && (
        <Knob value={panVal} min={0} max={127} size={20} label={`${label} Pan`}
          onChange={onPanChange} />
      )}
      <span className="text-[8px] text-gray-500">
        {pan === 0 ? "C" : pan > 0 ? `${Math.round(pan * 100)}R` : `${Math.round(-pan * 100)}L`}
      </span>
      {onToggleMute && (
        <button
          className={`w-5 h-5 rounded text-[8px] font-bold ${mute ? "bg-red-600 text-white" : "bg-gray-700 text-gray-400"}`}
          onClick={onToggleMute}
        >M</button>
      )}
    </div>
  );
});
