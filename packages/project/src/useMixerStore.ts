import { create } from "zustand";

export interface InsertFx {
  type: "delay" | "reverb";
  enabled: boolean;
  wet: number;
}

export interface FxSend {
  busId: string;
  level: number;
}

export interface MixerChannel {
  id: string;
  name: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  meterLevel: number;
  insertFx: InsertFx[];
  sends: FxSend[];
  busId?: string;
}

export interface MixerBus {
  id: string;
  name: string;
  type: "aux" | "group";
  volume: number;
  pan: number;
  mute: boolean;
  insertFx: InsertFx[];
  meterLevel: number;
}

export interface MixerStore {
  channels: MixerChannel[];
  buses: MixerBus[];
  masterVolume: number;
  masterMeterLevel: number;
  meterLevels: Record<string, number>;
  addChannel: (name?: string, id?: string) => void;
  removeChannel: (id: string) => void;
  setVolume: (id: string, volume: number) => void;
  setPan: (id: string, pan: number) => void;
  toggleMute: (id: string) => void;
  toggleSolo: (id: string) => void;
  setMasterVolume: (volume: number) => void;
  renameChannel: (id: string, name: string) => void;
  setMeterLevel: (id: string, level: number) => void;
  setMasterMeterLevel: (level: number) => void;
  setSendLevel: (channelId: string, busId: string, level: number) => void;
  setInsertFxEnabled: (channelId: string, index: number, enabled: boolean) => void;
  setInsertFxWet: (channelId: string, index: number, wet: number) => void;
  setChannelRouting: (channelId: string, busId?: string) => void;
  addBus: (name: string, type: "aux" | "group") => string;
  removeBus: (busId: string) => void;
  setBusVolume: (busId: string, volume: number) => void;
  toggleBusMute: (busId: string) => void;
  setBusMeterLevel: (busId: string, level: number) => void;
}

let chCounter = 0;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

const DEFAULT_INSERT_FX: InsertFx[] = [
  { type: "delay", enabled: false, wet: 0.3 },
  { type: "reverb", enabled: false, wet: 0.3 },
];

const DEFAULT_SENDS: FxSend[] = [
  { busId: "reverb-bus", level: 0 },
  { busId: "delay-bus", level: 0 },
];

function buildDefaultBuses(): MixerBus[] {
  return [
    { id: "reverb-bus", name: "Reverb", type: "aux", volume: 0.8, pan: 0, mute: false, insertFx: [{ type: "reverb", enabled: true, wet: 1 }], meterLevel: 0 },
    { id: "delay-bus", name: "Delay", type: "aux", volume: 0.8, pan: 0, mute: false, insertFx: [{ type: "delay", enabled: true, wet: 1 }], meterLevel: 0 },
  ];
}

export const useMixerStore = create<MixerStore>((set) => ({
  channels: [],
  buses: buildDefaultBuses(),
  masterVolume: 1,
  masterMeterLevel: 0,
  meterLevels: {},
  addChannel: (name?: string, id?: string) => {
    chCounter++;
    const ch: MixerChannel = {
      id: id ?? crypto.randomUUID(),
      name: name ?? `Channel ${chCounter}`,
      volume: 1,
      pan: 0,
      mute: false,
      solo: false,
      meterLevel: 0,
      insertFx: DEFAULT_INSERT_FX.map((f) => ({ ...f })),
      sends: DEFAULT_SENDS.map((s) => ({ ...s })),
    };
    set((s) => ({ channels: [...s.channels, ch] }));
  },
  removeChannel: (id: string) => {
    set((s) => ({ channels: s.channels.filter((c) => c.id !== id) }));
  },
  setVolume: (id: string, volume: number) => {
    const v = clamp(volume, 0, 1);
    set((s) => ({
      channels: s.channels.map((c) => (c.id === id ? { ...c, volume: v } : c)),
    }));
  },
  setPan: (id: string, pan: number) => {
    const p = clamp(pan, -1, 1);
    set((s) => ({
      channels: s.channels.map((c) => (c.id === id ? { ...c, pan: p } : c)),
    }));
  },
  toggleMute: (id: string) => {
    set((s) => ({
      channels: s.channels.map((c) => (c.id === id ? { ...c, mute: !c.mute } : c)),
    }));
  },
  toggleSolo: (id: string) => {
    set((s) => ({
      channels: s.channels.map((c) => (c.id === id ? { ...c, solo: !c.solo } : c)),
    }));
  },
  setMasterVolume: (volume: number) => {
    set({ masterVolume: clamp(volume, 0, 1) });
  },
  renameChannel: (id: string, name: string) => {
    set((s) => ({
      channels: s.channels.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  },
  setMeterLevel: (id, level) => {
    set((s) => ({
      meterLevels: { ...s.meterLevels, [id]: level },
      channels: s.channels.map((c) => (c.id === id ? { ...c, meterLevel: level } : c)),
    }));
  },
  setMasterMeterLevel: (level) => {
    set({ masterMeterLevel: level });
  },
  setSendLevel: (channelId: string, busId: string, level: number) => {
    const v = clamp(level, 0, 1);
    set((s) => ({
      channels: s.channels.map((c) =>
        c.id === channelId
          ? { ...c, sends: c.sends.map((sd) => (sd.busId === busId ? { ...sd, level: v } : sd)) }
          : c
      ),
    }));
  },
  setInsertFxEnabled: (channelId: string, index: number, enabled: boolean) => {
    set((s) => ({
      channels: s.channels.map((c) =>
        c.id === channelId && c.insertFx[index]
          ? { ...c, insertFx: c.insertFx.map((fx, i) => (i === index ? { ...fx, enabled } : fx)) }
          : c
      ),
    }));
  },
  setInsertFxWet: (channelId: string, index: number, wet: number) => {
    const v = clamp(wet, 0, 1);
    set((s) => ({
      channels: s.channels.map((c) =>
        c.id === channelId && c.insertFx[index]
          ? { ...c, insertFx: c.insertFx.map((fx, i) => (i === index ? { ...fx, wet: v } : fx)) }
          : c
      ),
    }));
  },
  setChannelRouting: (channelId: string, busId?: string) => {
    set((s) => ({
      channels: s.channels.map((c) =>
        c.id === channelId ? { ...c, busId } : c
      ),
    }));
  },
  addBus: (name: string, type: "aux" | "group") => {
    const id = crypto.randomUUID();
    set((s) => ({
      buses: [...s.buses, { id, name, type, volume: 1, pan: 0, mute: false, insertFx: DEFAULT_INSERT_FX.map((f) => ({ ...f })), meterLevel: 0 }],
    }));
    return id;
  },
  removeBus: (busId: string) => {
    set((s) => ({
      buses: s.buses.filter((b) => b.id !== busId),
      channels: s.channels.map((c) =>
        c.busId === busId ? { ...c, busId: undefined } : c
      ),
    }));
  },
  setBusVolume: (busId: string, volume: number) => {
    const v = clamp(volume, 0, 1);
    set((s) => ({
      buses: s.buses.map((b) => (b.id === busId ? { ...b, volume: v } : b)),
    }));
  },
  toggleBusMute: (busId: string) => {
    set((s) => ({
      buses: s.buses.map((b) => (b.id === busId ? { ...b, mute: !b.mute } : b)),
    }));
  },
  setBusMeterLevel: (busId: string, level: number) => {
    set((s) => ({
      buses: s.buses.map((b) => (b.id === busId ? { ...b, meterLevel: level } : b)),
    }));
  },
}));
