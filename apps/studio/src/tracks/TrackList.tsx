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
    <div className="w-56 bg-[#14151f] border-r border-gray-800 flex flex-col shrink-0">
      <div className="h-7 border-b border-gray-800 flex items-center px-2 text-[9px] text-gray-500 uppercase tracking-wider shrink-0">
        Tracks
      </div>
      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="p-2 text-[10px] text-gray-600 italic">No tracks</div>
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
      <button className="m-1 py-1 px-2 bg-gray-800 hover:bg-gray-700 rounded text-[10px] text-gray-400 text-left shrink-0"
        onClick={onAddTrack}>
        + Add track
      </button>
    </div>
  );
}
