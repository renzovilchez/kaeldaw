export interface ClipData {
  id: number;
  trackId: string;
  trackIndex: number;
  startTick: number;
  durationTicks: number;
  color: string;
  name: string;
  notes: MidiNoteData[];
  startOffset: number;
}

export interface MidiNoteData {
  id: number;
  note: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
  color?: string;
}
