import { TrackRow } from "./TrackRow";

export function TrackList({ tracks, selectedId, channelMap,
  onSelect, onToggleMute, onToggleSolo, onVolumeChange, onPanChange, onAddTrack }: {
  tracks: { id: string; name: string }[];
  selectedId: string | null;
  channelMap: Map<string, { mute: boolean; solo: boolean; volume: number; pan: number }>;
  onSelect: (id: string) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onVolumeChange: (id: string, v: number) => void;
  onPanChange: (id: string, v: number) => void;
  onAddTrack: () => void;
}) {
  return (
    <div className="w-56 bg-surface-alt border-r border-border flex flex-col shrink-0 h-full">
      <div className="h-7 border-b border-border flex items-center justify-between px-3 text-[10px] text-text-muted uppercase tracking-wider shrink-0">
        <span>Tracks</span>
        <span className="text-text-dim">{tracks.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="p-3 text-[10px] text-text-muted italic">No tracks</div>
        ) : tracks.map((track) => {
          const ch = channelMap.get(track.id);
          return (
            <TrackRow key={track.id} track={track} selectedId={selectedId}
              mute={ch?.mute ?? false} solo={ch?.solo ?? false} volume={ch?.volume ?? 1} pan={ch?.pan ?? 0}
              onSelect={onSelect} onToggleMute={onToggleMute} onToggleSolo={onToggleSolo}
              onVolumeChange={onVolumeChange} onPanChange={onPanChange} />
          );
        })}
      </div>
      <button className="m-1.5 py-1.5 px-3 bg-accent-bg hover:bg-accent rounded text-[10px] text-accent-hover hover:text-white text-left shrink-0 transition-colors"
        onClick={onAddTrack}>
        + Add track
      </button>
    </div>
  );
}
