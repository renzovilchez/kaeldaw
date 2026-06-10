import { create } from "zustand";
import { Transport } from "@kaeldaw/audio-engine/Transport";
import { Clock } from "@kaeldaw/audio-engine/Clock";
import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";

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

Clock.onTick = () => {
  useTransportStore.setState({ position: Transport.position });
};

export const useTransportStore = create<TransportStore>((set) => ({
  state: Transport.state,
  bpm: Transport.bpm,
  position: Transport.position,
  ppqn: Transport.ppqn,
  timeSignature: { ...Transport.timeSignature },
  play: () => {
    try {
      AudioContextManager.init();
      AudioContextManager.resume();
    } catch {
      // AudioContext no disponible (entorno sin Web Audio)
    }
    Transport.play();
    Clock.start();
    set({ state: Transport.state, position: Transport.position });
  },
  pause: () => {
    Clock.stop();
    Transport.pause();
    set({ state: Transport.state, position: Transport.position });
  },
  stop: () => {
    Clock.stop();
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
