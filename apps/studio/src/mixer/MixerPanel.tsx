import { useRef, useEffect, createElement, memo } from "react";

interface ChannelData {
  id: string; name: string; volume: number; pan: number;
  mute: boolean; solo: boolean; meterLevel: number;
  insertDelay: boolean; insertReverb: boolean; sendLevel: number;
}

interface BusData {
  id: string; name: string; type: string;
  volume: number; pan: number; mute: boolean; meterLevel: number;
}

const MixerChannelItem = memo(function MixerChannelItem({
  channel, index,
  onVolumeChange, onPanChange, onToggleMute, onToggleSolo,
  onInsertDelay, onInsertReverb, onSendLevel,
}: {
  channel: ChannelData;
  index: number;
  onVolumeChange: (id: string, v: number) => void;
  onPanChange: (id: string, v: number) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onInsertDelay: (id: string, enabled: boolean) => void;
  onInsertReverb: (id: string, enabled: boolean) => void;
  onSendLevel: (id: string, level: number) => void;
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
    el.setAttribute("insert-delay", String(channel.insertDelay));
    el.setAttribute("insert-reverb", String(channel.insertReverb));
    el.setAttribute("send-level", String(channel.sendLevel));
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
    const hDelay = (e: Event) => onInsertDelay(channel.id, (e as CustomEvent).detail.enabled);
    const hReverb = (e: Event) => onInsertReverb(channel.id, (e as CustomEvent).detail.enabled);
    const hSend = (e: Event) => onSendLevel(channel.id, (e as CustomEvent).detail.level);
    el.addEventListener("volume-change", hVolume);
    el.addEventListener("pan-change", hPan);
    el.addEventListener("toggle-mute", hMute);
    el.addEventListener("toggle-solo", hSolo);
    el.addEventListener("insert-delay-change", hDelay);
    el.addEventListener("insert-reverb-change", hReverb);
    el.addEventListener("send-level-change", hSend);
    return () => {
      el.removeEventListener("volume-change", hVolume);
      el.removeEventListener("pan-change", hPan);
      el.removeEventListener("toggle-mute", hMute);
      el.removeEventListener("toggle-solo", hSolo);
      el.removeEventListener("insert-delay-change", hDelay);
      el.removeEventListener("insert-reverb-change", hReverb);
      el.removeEventListener("send-level-change", hSend);
    };
  }, [channel.id, onVolumeChange, onPanChange, onToggleMute, onToggleSolo, onInsertDelay, onInsertReverb, onSendLevel]);

  // eslint-disable-next-line react-hooks/refs
  return createElement("daw-mixer-channel", { ref, style: { width: "60px", flexShrink: "0" as const } });
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

  // eslint-disable-next-line react-hooks/refs
  return createElement("daw-mixer-channel", { ref, style: { width: "60px", flexShrink: "0" as const } });
});

const BusChannelItem = memo(function BusChannelItem({
  bus, onVolumeChange, onToggleMute,
}: {
  bus: BusData;
  onVolumeChange: (id: string, v: number) => void;
  onToggleMute: (id: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("channel-name", bus.name);
    el.setAttribute("channel-number", "B");
    el.setAttribute("volume", String(bus.volume));
    el.setAttribute("meter-level", String(bus.meterLevel));
    if (bus.mute) el.setAttribute("mute", "");
    else el.removeAttribute("mute");
    el.removeAttribute("solo");
  }, [bus]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hVolume = (e: Event) => onVolumeChange(bus.id, (e as CustomEvent).detail.volume);
    const hMute = () => onToggleMute(bus.id);
    el.addEventListener("volume-change", hVolume);
    el.addEventListener("toggle-mute", hMute);
    return () => {
      el.removeEventListener("volume-change", hVolume);
      el.removeEventListener("toggle-mute", hMute);
    };
  }, [bus.id, onVolumeChange, onToggleMute]);

  // eslint-disable-next-line react-hooks/refs
  return createElement("daw-mixer-channel", { ref, style: { width: "60px", flexShrink: "0" as const } });
});

export function MixerPanel({ channels, buses, masterVolume, masterMeterLevel,
  onVolumeChange, onPanChange, onToggleMute, onToggleSolo, onSetMasterVolume,
  onInsertDelay, onInsertReverb, onSendLevel,
  onBusVolume, onToggleBusMute }: {
  channels: ChannelData[];
  buses: BusData[];
  masterVolume: number;
  masterMeterLevel: number;
  onVolumeChange: (id: string, v: number) => void;
  onPanChange: (id: string, v: number) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onSetMasterVolume: (v: number) => void;
  onInsertDelay: (id: string, enabled: boolean) => void;
  onInsertReverb: (id: string, enabled: boolean) => void;
  onSendLevel: (id: string, level: number) => void;
  onBusVolume: (id: string, v: number) => void;
  onToggleBusMute: (id: string) => void;
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
            onInsertDelay={onInsertDelay}
            onInsertReverb={onInsertReverb}
            onSendLevel={onSendLevel}
          />
        ))}
      </div>
      {buses.length > 0 && (
        <div className="border-t border-border p-1 flex justify-center gap-0.5 shrink-0">
          {buses.map((bus) => (
            <BusChannelItem key={bus.id} bus={bus} onVolumeChange={onBusVolume} onToggleMute={onToggleBusMute} />
          ))}
        </div>
      )}
      <div className="border-t border-border p-1 flex justify-center shrink-0">
        <MasterChannelItem volume={masterVolume} meterLevel={masterMeterLevel} onVolumeChange={onSetMasterVolume} />
      </div>
    </div>
  );
}