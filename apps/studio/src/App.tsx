import { useEffect, useRef, createElement, memo, useMemo } from "react";
import { TransportPanel } from "@kaeldaw/ui-kit/TransportPanel";
import { useTracksStore } from "@kaeldaw/project/useTracksStore";
import { useMixerStore } from "@kaeldaw/project/useMixerStore";
import { useProjectStore } from "@kaeldaw/project/useProjectStore";

function Knob({ value, min, max, size, label, onChange }: {
  value: number; min: number; max: number; size?: number; label?: string;
  onChange?: (v: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !onChange) return;
    const handler = (e: Event) => onChange((e as CustomEvent).detail.value);
    el.addEventListener("input", handler);
    return () => el.removeEventListener("input", handler);
  }, [onChange]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("value", String(value));
    el.setAttribute("min", String(min));
    el.setAttribute("max", String(max));
    if (size) el.setAttribute("size", String(size));
    if (label) el.setAttribute("label", label);
  });
  // eslint-disable-next-line react-hooks/refs
  return createElement("daw-knob", { ref, style: { display: "inline-block" } });
}

function Fader({ value, min, max, width, height, label, onChange }: {
  value: number; min: number; max: number; width?: number; height?: number;
  label?: string; onChange?: (v: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !onChange) return;
    const handler = (e: Event) => onChange((e as CustomEvent).detail.value);
    el.addEventListener("input", handler);
    return () => el.removeEventListener("input", handler);
  }, [onChange]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("value", String(value));
    el.setAttribute("min", String(min));
    el.setAttribute("max", String(max));
    if (width) el.setAttribute("width", String(width));
    if (height) el.setAttribute("height", String(height));
    if (label) el.setAttribute("label", label);
  });
  // eslint-disable-next-line react-hooks/refs
  return createElement("daw-fader", { ref, style: { display: "inline-block" } });
}

const TrackRow = memo(function TrackRow({ track, selectedId, mute, solo, volume, pan,
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

const MixerChannelCard = memo(function MixerChannelCard({ label, volume, pan, mute, isMaster,
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

function App() {
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
  const setMasterVolume = useMixerStore((s) => s.setMasterVolume);
  const projectName = useProjectStore((s) => s.name);
  const setName = useProjectStore((s) => s.setName);

  const channelMap = useMemo(() => {
    const m = new Map<string, typeof channels[0]>();
    for (const c of channels) m.set(c.id, c);
    return m;
  }, [channels]);

  const handleAddTrack = () => {
    const name = `Track ${tracks.length + 1}`;
    addTrack(name);
    const newTrack = useTracksStore.getState().tracks.at(-1);
    if (newTrack) addChannel(newTrack.name, newTrack.id);
  };

  return (
    <div className="h-screen bg-[#0d0e15] text-gray-300 font-mono text-sm select-none flex flex-col">
      {/* safelist: clases usadas por paquetes workspace que Tailwind no escanea */}
      <span className="hidden w-8 h-8 text-base bg-black tracking-widest border-dotted" aria-hidden="true" />
      {/* Top bar */}
      <div className="h-8 bg-[#14151f] border-b border-gray-800 flex items-center px-3 gap-4 shrink-0">
        <span className="text-cyan-400 font-bold tracking-tight text-xs">KaelDAW</span>
        <div className="h-3 w-px bg-gray-700" />
        <input
          className="bg-transparent text-[10px] text-gray-500 outline-none border-b border-transparent hover:border-gray-600 focus:border-cyan-500 focus:text-gray-200 w-36"
          value={projectName}
          onChange={(e) => setName(e.target.value)}
          title="Project name"
        />
        <div className="flex-1" />
      </div>

      {/* Transport */}
      <div className="px-6">
        <TransportPanel />
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Track list */}
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
                  onSelect={selectTrack} onToggleMute={toggleMute} onToggleSolo={toggleSolo}
                  onVolumeChange={setVolume} onPanChange={setPan} />
              );
            })}
          </div>
          <button className="m-1 py-1 px-2 bg-gray-800 hover:bg-gray-700 rounded text-[10px] text-gray-400 text-left shrink-0"
            onClick={handleAddTrack}>
            + Add track
          </button>
        </div>

        {/* Center: Main area */}
        <div className="flex-1 bg-[#11121a] flex flex-col">
          {/* Timeline ruler */}
          <div className="h-7 border-b border-gray-800 flex bg-[#0d0e15] shrink-0">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-gray-800/50 flex items-end justify-center pb-1">
                <span className="text-[8px] text-gray-600">{i + 1}</span>
              </div>
            ))}
          </div>
          {/* Empty arrangement area */}
          <div className="flex-1 flex items-center justify-center text-[10px] text-gray-600 italic">
            {tracks.length === 0 ? "Add a track to begin" : "Arrangement view — coming in F1"}
          </div>
        </div>

        {/* Right: Mixer */}
        <div className="w-56 bg-[#14151f] border-l border-gray-800 flex flex-col shrink-0">
          <div className="h-7 border-b border-gray-800 flex items-center px-2 text-[9px] text-gray-500 uppercase tracking-wider shrink-0">
            Mixer
          </div>
          <div className="flex-1 overflow-y-auto p-1 flex flex-col gap-1">
            {channels.map((ch) => (
              <MixerChannelCard key={ch.id} label={ch.name} volume={ch.volume}
                pan={ch.pan} mute={ch.mute}
                onVolumeChange={(v) => setVolume(ch.id, v / 127)}
                onPanChange={(v) => setPan(ch.id, (v / 127) * 2 - 1)}
                onToggleMute={() => toggleMute(ch.id)} />
            ))}
          </div>
          <div className="border-t border-gray-800 p-1">
            <MixerChannelCard label="Master" volume={masterVolume} pan={0} mute={false} isMaster
              onVolumeChange={(v) => setMasterVolume(v / 127)} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
