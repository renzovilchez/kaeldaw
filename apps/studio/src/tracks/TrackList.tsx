import { memo } from "react";
import { TrackRow } from "./TrackRow";

export type PresetInfo = { name: string; icon: string };

export const TrackList = memo(function TrackList({
  tracks,
  selectedId,
  channelMap,
  presets,
  onSelect,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onPanChange,
  onAddTrack,
  onColorChange,
}: {
  tracks: { id: string; name: string; color: string; presetId: string }[];
  selectedId: string | null;
  channelMap: Map<
    string,
    { mute: boolean; solo: boolean; volume: number; pan: number }
  >;
  presets?: Map<string, PresetInfo>;
  onSelect: (id: string) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onVolumeChange: (id: string, v: number) => void;
  onPanChange: (id: string, v: number) => void;
  onAddTrack: () => void;
  onColorChange?: (id: string, color: string) => void;
}) {
  return (
    <div className="w-56 bg-surface-alt border-r border-border flex flex-col shrink-0 h-full">
      <div className="h-7 border-b border-border flex items-center justify-between px-3 text-[10px] text-text-muted uppercase tracking-wider shrink-0">
        <span>Tracks</span>
        <span className="text-text-dim">{tracks.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="p-3 text-[10px] text-text-muted italic">
            No tracks
          </div>
        ) : (
          tracks.map((track) => {
            const ch = channelMap.get(track.id);
            const pi = presets?.get(track.presetId);
            return (
              <TrackRow
                key={track.id}
                track={track}
                selectedId={selectedId}
                mute={ch?.mute ?? false}
                solo={ch?.solo ?? false}
                volume={ch?.volume ?? 1}
                pan={ch?.pan ?? 0}
                presetName={pi?.name}
                presetIcon={pi?.icon}
                onSelect={onSelect}
                onToggleMute={onToggleMute}
                onToggleSolo={onToggleSolo}
                onVolumeChange={onVolumeChange}
                onPanChange={onPanChange}
                onColorChange={onColorChange}
              />
            );
          })
        )}
      </div>
      <button
        className="m-1.5 py-1.5 px-3 bg-accent-bg hover:bg-accent rounded text-[10px] text-accent-hover hover:text-white text-left shrink-0 transition-colors"
        onClick={onAddTrack}
      >
        + Add track
      </button>
    </div>
  );
});
