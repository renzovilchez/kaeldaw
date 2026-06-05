import { create } from "zustand";
import type { ProjectSchema } from "./schema";

function isTimeSignature(s: string): boolean {
  return /^\d+\/\d+$/.test(s);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export interface ProjectStore {
  name: string;
  bpm: number;
  timeSignature: string;
  ppqn: number;
  setName: (name: string) => void;
  setBpm: (bpm: number) => void;
  setTimeSignature: (ts: string) => void;
  loadFromSchema: (schema: ProjectSchema) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  name: "Untitled",
  bpm: 120,
  timeSignature: "4/4",
  ppqn: 960,
  setName: (name: string) => {
    set({ name });
  },
  setBpm: (bpm: number) => {
    set({ bpm: clamp(bpm, 20, 300) });
  },
  setTimeSignature: (ts: string) => {
    if (isTimeSignature(ts)) {
      set({ timeSignature: ts });
    }
  },
  loadFromSchema: (schema: ProjectSchema) => {
    set({
      name: schema.name,
      bpm: schema.bpm,
      timeSignature: schema.timeSignature,
      ppqn: schema.ppqn,
    });
  },
  reset: () => {
    set({ name: "Untitled", bpm: 120, timeSignature: "4/4", ppqn: 960 });
  },
}));
