import { create } from "zustand";

export interface MixerChannel {
  id: string;
  name: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  meterLevel: number;
}

export interface MixerStore {
  channels: MixerChannel[];
  masterVolume: number;
  masterMeterLevel: number;
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
}

let chCounter = 0;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export const useMixerStore = create<MixerStore>((set) => ({
  channels: [],
  masterVolume: 1,
  masterMeterLevel: 0,
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
      channels: s.channels.map((c) => (c.id === id ? { ...c, meterLevel: level } : c)),
    }));
  },
  setMasterMeterLevel: (level) => {
    set({ masterMeterLevel: level });
  },
}));
