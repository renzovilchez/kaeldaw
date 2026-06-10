import { useRef, useEffect, createElement, memo } from "react";

const MixerChannelItem = memo(function MixerChannelItem({
  channel, index,
  onVolumeChange, onPanChange, onToggleMute, onToggleSolo,
}: {
  channel: { id: string; name: string; volume: number; pan: number; mute: boolean; solo: boolean; meterLevel: number };
  index: number;
  onVolumeChange: (id: string, v: number) => void;
  onPanChange: (id: string, v: number) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("channel-name", channel.name);
    el.setAttribute("channel-number", String(index + 1));
    el.setAttribute("volume", String(channel.volume));
    el.setAttribute("pan", String(channel.pan));
    el.setAttribute("meter-level", String(channel.meterLevel));
    if (channel.mute) el.setAttribute("mute", "");
    else el.removeAttribute("mute");
    if (channel.solo) el.setAttribute("solo", "");
    else el.removeAttribute("solo");
  }, [channel]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hVolume = (e: Event) => onVolumeChange(channel.id, (e as CustomEvent).detail.volume);
    const hPan = (e: Event) => onPanChange(channel.id, (e as CustomEvent).detail.pan);
    const hMute = () => onToggleMute(channel.id);
    const hSolo = () => onToggleSolo(channel.id);
    el.addEventListener("volume-change", hVolume);
    el.addEventListener("pan-change", hPan);
    el.addEventListener("toggle-mute", hMute);
    el.addEventListener("toggle-solo", hSolo);
    return () => {
      el.removeEventListener("volume-change", hVolume);
      el.removeEventListener("pan-change", hPan);
      el.removeEventListener("toggle-mute", hMute);
      el.removeEventListener("toggle-solo", hSolo);
    };
  }, [channel.id, onVolumeChange, onPanChange, onToggleMute, onToggleSolo]);

  return createElement("daw-mixer-channel", { ref, style: { width: "52px", flexShrink: "0" as const } });
});

const MasterChannelItem = memo(function MasterChannelItem({
  volume, meterLevel, onVolumeChange,
}: {
  volume: number;
  meterLevel: number;
  onVolumeChange: (v: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("channel-name", "Master");
    el.setAttribute("channel-number", "M");
    el.setAttribute("volume", String(volume));
    el.setAttribute("meter-level", String(meterLevel));
    el.removeAttribute("mute");
    el.removeAttribute("solo");
  }, [volume, meterLevel]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hVolume = (e: Event) => onVolumeChange((e as CustomEvent).detail.volume);
    el.addEventListener("volume-change", hVolume);
    return () => el.removeEventListener("volume-change", hVolume);
  }, [onVolumeChange]);

  return createElement("daw-mixer-channel", { ref, style: { width: "52px", flexShrink: "0" as const } });
});

export function MixerPanel({ channels, masterVolume, masterMeterLevel,
  onVolumeChange, onPanChange, onToggleMute, onToggleSolo, onSetMasterVolume,
  delayEnabled, reverbEnabled, onToggleDelay, onToggleReverb }: {
  channels: { id: string; name: string; volume: number; pan: number; mute: boolean; solo: boolean; meterLevel: number }[];
  masterVolume: number;
  masterMeterLevel: number;
  onVolumeChange: (id: string, v: number) => void;
  onPanChange: (id: string, v: number) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onSetMasterVolume: (v: number) => void;
  delayEnabled: boolean;
  reverbEnabled: boolean;
  onToggleDelay: () => void;
  onToggleReverb: () => void;
}) {
  return (
    <div className="h-full bg-surface-alt flex flex-col">
      <div className="h-7 border-b border-border flex items-center px-3 text-[10px] text-text-muted uppercase tracking-wider shrink-0">
        Mixer
      </div>
      <div className="flex-1 overflow-x-auto p-1 flex items-start gap-0.5">
        {channels.map((ch, i) => (
          <MixerChannelItem key={ch.id} channel={ch} index={i}
            onVolumeChange={onVolumeChange}
            onPanChange={onPanChange}
            onToggleMute={onToggleMute}
            onToggleSolo={onToggleSolo}
          />
        ))}
      </div>
      {/* FX controls row */}
      <div className="border-t border-border px-2 py-1 flex items-center gap-1 justify-center shrink-0">
        <button
          className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${delayEnabled ? "bg-[#3b82f6] text-white" : "bg-[#4a4a4a] text-[#999] hover:bg-[#555]"}`}
          onClick={onToggleDelay}
          title={`Delay ${delayEnabled ? "ON" : "OFF"}`}
        >D</button>
        <button
          className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${reverbEnabled ? "bg-[#3b82f6] text-white" : "bg-[#4a4a4a] text-[#999] hover:bg-[#555]"}`}
          onClick={onToggleReverb}
          title={`Reverb ${reverbEnabled ? "ON" : "OFF"}`}
        >R</button>
        <span className="text-[8px] text-[#666] ml-1">FX</span>
      </div>
      <div className="border-t border-border p-1 flex justify-center">
        <MasterChannelItem volume={masterVolume} meterLevel={masterMeterLevel} onVolumeChange={onSetMasterVolume} />
      </div>
    </div>
  );
}
