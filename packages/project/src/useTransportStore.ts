import { create } from "zustand";
import { Transport } from "@kaeldaw/audio-engine/Transport";
import { Clock } from "@kaeldaw/audio-engine/Clock";
import { AudioScheduler } from "@kaeldaw/audio-engine/AudioScheduler";
import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";

export interface TransportStore {
  state: string;
  bpm: number;
  position: number;
  ppqn: number;
  timeSignature: { beats: number; beatValue: number };
  metronomeEnabled: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setTimeSignature: (beats: number, beatValue: number) => void;
  toggleMetronome: () => void;
}

AudioScheduler.onPosition = (tick) => {
  useTransportStore.setState({ position: tick });
};

export const useTransportStore = create<TransportStore>((set) => ({
  state: Transport.state,
  bpm: Transport.bpm,
  position: Transport.position,
  ppqn: Transport.ppqn,
  timeSignature: { ...Transport.timeSignature },
  metronomeEnabled: false,
  play: () => {
    AudioContextManager.init();
    void AudioContextManager.resume();
    Transport.play();
    Clock.start();
    set({ state: Transport.state, position: Transport.position });
  },
  pause: () => {
    AudioScheduler.stop();
    Clock.stop();
    Transport.pause();
    set({ state: Transport.state, position: Transport.position });
  },
  stop: () => {
    AudioScheduler.stop();
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
  toggleMetronome: () => {
    set((prev) => ({ metronomeEnabled: !prev.metronomeEnabled }));
  },
}));
