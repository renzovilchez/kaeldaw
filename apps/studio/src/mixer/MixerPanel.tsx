import { MixerChannelCard } from "./MixerChannelCard";

export function MixerPanel({ channels, masterVolume,
  onVolumeChange, onPanChange, onToggleMute, onSetMasterVolume }: {
  channels: { id: string; name: string; volume: number; pan: number; mute: boolean }[];
  masterVolume: number;
  onVolumeChange: (id: string, v: number) => void;
  onPanChange: (id: string, v: number) => void;
  onToggleMute: (id: string) => void;
  onSetMasterVolume: (v: number) => void;
}) {
  return (
    <div className="w-56 bg-[#14151f] border-l border-gray-800 flex flex-col shrink-0">
      <div className="h-7 border-b border-gray-800 flex items-center px-2 text-[9px] text-gray-500 uppercase tracking-wider shrink-0">
        Mixer
      </div>
      <div className="flex-1 overflow-y-auto p-1 flex flex-col gap-1">
        {channels.map((ch) => (
          <MixerChannelCard key={ch.id} label={ch.name} volume={ch.volume}
            pan={ch.pan} mute={ch.mute}
            onVolumeChange={(v) => onVolumeChange(ch.id, v / 127)}
            onPanChange={(v) => onPanChange(ch.id, (v / 127) * 2 - 1)}
            onToggleMute={() => onToggleMute(ch.id)} />
        ))}
      </div>
      <div className="border-t border-gray-800 p-1">
        <MixerChannelCard label="Master" volume={masterVolume} pan={0} mute={false} isMaster
          onVolumeChange={(v) => onSetMasterVolume(v / 127)} />
      </div>
    </div>
  );
}
