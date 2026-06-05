import { create } from "zustand";
import { Transport } from "@kaeldaw/audio-engine/Transport";

export interface TransportStore {
  state: string;
  bpm: number;
  position: number;
  ppqn: number;
  timeSignature: { beats: number; beatValue: number };
  play: () => void;
  pause: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setTimeSignature: (beats: number, beatValue: number) => void;
}

export const useTransportStore = create<TransportStore>((set) => ({
  state: Transport.state,
  bpm: Transport.bpm,
  position: Transport.position,
  ppqn: Transport.ppqn,
  timeSignature: { ...Transport.timeSignature },
  play: () => {
    Transport.play();
    set({ state: Transport.state });
  },
  pause: () => {
    Transport.pause();
    set({ state: Transport.state });
  },
  stop: () => {
    Transport.stop();
    set({ state: Transport.state, position: Transport.position });
  },
  setBpm: (bpm: number) => {
    Transport.setBpm(bpm);
    set({ bpm: Transport.bpm });
  },
  setTimeSignature: (beats: number, beatValue: number) => {
    Transport.setTimeSignature(beats, beatValue);
    set({ timeSignature: { ...Transport.timeSignature } });
  },
}));
