export type TransportState = "stopped" | "playing" | "paused";

export interface TimeSignature {
  beats: number;
  beatValue: number;
}

export interface CoreTrack {
  id: string;
  name: string;
  color: string;
  presetId: string;
  presetEngine: string;
  sampleId?: string;
}

export interface CoreMidiNote {
  id: number;
  note: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
  color?: string;
}

export interface CoreClip {
  id: number;
  trackId: string;
  trackIndex: number;
  startTick: number;
  durationTicks: number;
  color: string;
  name: string;
  notes: CoreMidiNote[];
  startOffset: number;
}

export interface CoreInsertFx {
  type: "delay" | "reverb";
  enabled: boolean;
  wet: number;
}

export interface CoreFxSend {
  busId: string;
  level: number;
}

export interface CoreMixerChannel {
  id: string;
  name: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  insertFx: CoreInsertFx[];
  sends: CoreFxSend[];
  busId?: string;
}

export interface CoreMixerBus {
  id: string;
  name: string;
  type: "aux" | "group";
  volume: number;
  pan: number;
  mute: boolean;
  insertFx: CoreInsertFx[];
}

export interface CoreMixer {
  channels: CoreMixerChannel[];
  buses: CoreMixerBus[];
  masterVolume: number;
}

export interface CoreTransport {
  state: TransportState;
  position: number;
  metronomeEnabled: boolean;
}

export interface CoreMeta {
  nextClipId: number;
  nextNoteId: number;
  trackCounter: number;
  selectedTrackId: string | null;
  historyVersion: number;
}

export interface CoreState {
  name: string;
  bpm: number;
  timeSignature: TimeSignature;
  ppqn: number;
  tracks: CoreTrack[];
  clips: CoreClip[];
  mixer: CoreMixer;
  transport: CoreTransport;
  meta: CoreMeta;
}
