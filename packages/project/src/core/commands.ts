import type {
  CoreClip,
  CoreMidiNote,
  CoreState,
  CoreTrack,
  CoreMixerBus,
  CoreMixerChannel,
} from "./types";

export const DEFAULT_BPM = 120;
export const DEFAULT_PPQN = 960;
export const MIN_BPM = 20;
export const MAX_BPM = 300;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampTick(value: number): number {
  return Math.max(0, Math.round(value));
}

function clampNote(value: number): number {
  return clamp(Math.round(value), 0, 127);
}

function clampVelocity(value: number): number {
  return clamp(Math.round(value), 0, 127);
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `track-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createProject(
  partial?: Partial<Pick<CoreState, "name" | "bpm" | "timeSignature" | "ppqn">>,
): CoreState {
  return {
    name: partial?.name ?? "Untitled",
    bpm: clamp(partial?.bpm ?? DEFAULT_BPM, MIN_BPM, MAX_BPM),
    timeSignature: partial?.timeSignature ?? { beats: 4, beatValue: 4 },
    ppqn: partial?.ppqn ?? DEFAULT_PPQN,
    tracks: [],
    clips: [],
    mixer: { channels: [], buses: [], masterVolume: 0.8 },
    transport: { state: "stopped", position: 0, metronomeEnabled: false },
    meta: { nextClipId: 1, nextNoteId: 1, trackCounter: 0, selectedTrackId: null, historyVersion: 0 },
  };
}

export function setName(state: CoreState, name: string): CoreState {
  return { ...state, name: name.trim() };
}

export function setTempo(state: CoreState, bpm: number): CoreState {
  return { ...state, bpm: clamp(bpm, MIN_BPM, MAX_BPM) };
}

export function setTimeSignature(
  state: CoreState,
  timeSignature: CoreState["timeSignature"],
): CoreState {
  return { ...state, timeSignature };
}

export function addTrack(
  state: CoreState,
  name?: string,
  presetId: string = "poly-saw",
  presetEngine: string = "synth",
  externalId?: string,
): CoreState {
  const counter = state.meta.trackCounter + 1;
  const track: CoreTrack = {
    id: externalId ?? makeId(),
    name: name ?? `Track ${counter}`,
    color: "#22d3ee",
    presetId,
    presetEngine,
  };
  return {
    ...state,
    tracks: [...state.tracks, track],
    meta: { ...state.meta, trackCounter: counter },
  };
}

export function removeTrack(state: CoreState, id: string): CoreState {
  return {
    ...state,
    tracks: state.tracks.filter((t) => t.id !== id),
    meta: {
      ...state.meta,
      selectedTrackId: state.meta.selectedTrackId === id ? null : state.meta.selectedTrackId,
    },
  };
}

export function renameTrack(state: CoreState, id: string, name: string): CoreState {
  return {
    ...state,
    tracks: state.tracks.map((t) => (t.id === id ? { ...t, name } : t)),
  };
}

export function selectTrack(state: CoreState, id: string | null): CoreState {
  return { ...state, meta: { ...state.meta, selectedTrackId: id } };
}

export function setTrackColor(state: CoreState, id: string, color: string): CoreState {
  return {
    ...state,
    tracks: state.tracks.map((t) => (t.id === id ? { ...t, color } : t)),
  };
}

export function setTrackPreset(state: CoreState, id: string, presetId: string): CoreState {
  return {
    ...state,
    tracks: state.tracks.map((t) => (t.id === id ? { ...t, presetId } : t)),
  };
}

export function setTrackEngine(
  state: CoreState,
  id: string,
  engine: string,
  sampleId?: string,
): CoreState {
  return {
    ...state,
    tracks: state.tracks.map((t) =>
      t.id === id ? { ...t, presetEngine: engine, sampleId } : t,
    ),
  };
}

export function reorderTracks(
  state: CoreState,
  fromIndex: number,
  toIndex: number,
): CoreState {
  const tracks = [...state.tracks];
  if (fromIndex < 0 || fromIndex >= tracks.length || toIndex < 0 || toIndex >= tracks.length) {
    return state;
  }
  const [moved] = tracks.splice(fromIndex, 1);
  tracks.splice(toIndex, 0, moved);
  return { ...state, tracks };
}

export function addClip(
  state: CoreState,
  clip: Omit<CoreClip, "id" | "notes" | "startOffset"> & {
    notes?: CoreMidiNote[];
    startOffset?: number;
  },
  externalId?: number,
): CoreState {
  const id = externalId ?? state.meta.nextClipId;
  const notes = clip.notes ?? [];
  const newClip: CoreClip = {
    ...clip,
    id,
    notes,
    startOffset: clip.startOffset ?? 0,
  };
  return {
    ...state,
    clips: [...state.clips, newClip],
    meta: { ...state.meta, nextClipId: Math.max(state.meta.nextClipId, id + 1) },
  };
}

export function removeClip(state: CoreState, id: number): CoreState {
  return { ...state, clips: state.clips.filter((c) => c.id !== id) };
}

export function moveClip(
  state: CoreState,
  id: number,
  startTick: number,
  trackIndex: number,
  trackId?: string,
): CoreState {
  return {
    ...state,
    clips: state.clips.map((c) =>
      c.id === id
        ? {
            ...c,
            startTick: clampTick(startTick),
            trackIndex,
            ...(trackId !== undefined ? { trackId } : {}),
          }
        : c,
    ),
  };
}

export function resizeClip(
  state: CoreState,
  id: number,
  startTick: number,
  durationTicks: number,
): CoreState {
  return {
    ...state,
    clips: state.clips.map((c) =>
      c.id === id
        ? { ...c, startTick: clampTick(startTick), durationTicks: Math.max(1, Math.round(durationTicks)) }
        : c,
    ),
  };
}

export function trimClip(
  state: CoreState,
  id: number,
  startOffset: number,
  durationTicks: number,
): CoreState {
  return {
    ...state,
    clips: state.clips.map((c) =>
      c.id === id
        ? { ...c, startOffset: Math.max(0, startOffset), durationTicks: Math.max(1, Math.round(durationTicks)) }
        : c,
    ),
  };
}

export function setClipNotes(
  state: CoreState,
  clipId: number,
  notes: CoreMidiNote[],
): CoreState {
  return {
    ...state,
    clips: state.clips.map((c) => (c.id === clipId ? { ...c, notes } : c)),
  };
}

export function addNote(
  state: CoreState,
  clipId: number,
  note: Omit<CoreMidiNote, "id">,
  externalId?: number,
): CoreState {
  const id = externalId ?? state.meta.nextNoteId;
  return {
    ...state,
    clips: state.clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            notes: [
              ...c.notes,
              {
                ...note,
                id,
                note: clampNote(note.note),
                startTick: clampTick(note.startTick),
                durationTicks: Math.max(1, Math.round(note.durationTicks)),
                velocity: clampVelocity(note.velocity),
              },
            ],
          }
        : c,
    ),
    meta: { ...state.meta, nextNoteId: Math.max(state.meta.nextNoteId, id + 1) },
  };
}

export function removeNote(state: CoreState, clipId: number, noteId: number): CoreState {
  return {
    ...state,
    clips: state.clips.map((c) =>
      c.id === clipId ? { ...c, notes: c.notes.filter((n) => n.id !== noteId) } : c,
    ),
  };
}

export function updateNote(
  state: CoreState,
  clipId: number,
  noteId: number,
  patch: Partial<Pick<CoreMidiNote, "note" | "startTick" | "durationTicks" | "velocity">>,
): CoreState {
  return {
    ...state,
    clips: state.clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            notes: c.notes.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    ...(patch.note !== undefined ? { note: clampNote(patch.note) } : {}),
                    ...(patch.startTick !== undefined ? { startTick: clampTick(patch.startTick) } : {}),
                    ...(patch.durationTicks !== undefined
                      ? { durationTicks: Math.max(1, Math.round(patch.durationTicks)) }
                      : {}),
                    ...(patch.velocity !== undefined ? { velocity: clampVelocity(patch.velocity) } : {}),
                  }
                : n,
            ),
          }
        : c,
    ),
  };
}

export function addMixerChannel(
  state: CoreState,
  channel: Partial<CoreMixerChannel> & { id: string },
): CoreState {
  const existing = state.mixer.channels.some((c) => c.id === channel.id);
  if (existing) return state;
  const newChannel: CoreMixerChannel = {
    id: channel.id,
    name: channel.name ?? channel.id,
    volume: channel.volume ?? 0.8,
    pan: channel.pan ?? 0,
    mute: channel.mute ?? false,
    solo: channel.solo ?? false,
    insertFx: channel.insertFx ?? [
      { type: "delay", enabled: false, wet: 0 },
      { type: "reverb", enabled: false, wet: 0 },
    ],
    sends: channel.sends ?? [],
    ...(channel.busId !== undefined ? { busId: channel.busId } : {}),
  };
  return {
    ...state,
    mixer: { ...state.mixer, channels: [...state.mixer.channels, newChannel] },
  };
}

export function removeMixerChannel(state: CoreState, id: string): CoreState {
  return {
    ...state,
    mixer: {
      ...state.mixer,
      channels: state.mixer.channels.filter((c) => c.id !== id),
    },
  };
}

export function setChannelVolume(state: CoreState, id: string, volume: number): CoreState {
  return {
    ...state,
    mixer: {
      ...state.mixer,
      channels: state.mixer.channels.map((c) =>
        c.id === id ? { ...c, volume: clamp(volume, 0, 2) } : c,
      ),
    },
  };
}

export function setChannelPan(state: CoreState, id: string, pan: number): CoreState {
  return {
    ...state,
    mixer: {
      ...state.mixer,
      channels: state.mixer.channels.map((c) =>
        c.id === id ? { ...c, pan: clamp(pan, -1, 1) } : c,
      ),
    },
  };
}

export function setChannelMute(state: CoreState, id: string, mute: boolean): CoreState {
  return {
    ...state,
    mixer: {
      ...state.mixer,
      channels: state.mixer.channels.map((c) => (c.id === id ? { ...c, mute } : c)),
    },
  };
}

export function setChannelSolo(state: CoreState, id: string, solo: boolean): CoreState {
  return {
    ...state,
    mixer: {
      ...state.mixer,
      channels: state.mixer.channels.map((c) => (c.id === id ? { ...c, solo } : c)),
    },
  };
}

export function setChannelInsertFx(
  state: CoreState,
  id: string,
  type: "delay" | "reverb",
  enabled: boolean,
  wet: number,
): CoreState {
  return {
    ...state,
    mixer: {
      ...state.mixer,
      channels: state.mixer.channels.map((c) =>
        c.id === id
          ? {
              ...c,
              insertFx: c.insertFx.map((fx) =>
                fx.type === type ? { ...fx, enabled, wet } : fx,
              ),
            }
          : c,
      ),
    },
  };
}

export function setChannelSend(
  state: CoreState,
  id: string,
  busId: string,
  level: number,
): CoreState {
  return {
    ...state,
    mixer: {
      ...state.mixer,
      channels: state.mixer.channels.map((c) => {
        if (c.id !== id) return c;
        const sends = c.sends.some((s) => s.busId === busId)
          ? c.sends.map((s) => (s.busId === busId ? { ...s, level } : s))
          : [...c.sends, { busId, level }];
        return { ...c, sends };
      }),
    },
  };
}

export function addMixerBus(state: CoreState, bus: Partial<CoreMixerBus> & { id: string }): CoreState {
  const existing = state.mixer.buses.some((b) => b.id === bus.id);
  if (existing) return state;
  const newBus: CoreMixerBus = {
    id: bus.id,
    name: bus.name ?? bus.id,
    type: bus.type ?? "aux",
    volume: bus.volume ?? 0.8,
    pan: bus.pan ?? 0,
    mute: bus.mute ?? false,
    insertFx: bus.insertFx ?? [],
  };
  return {
    ...state,
    mixer: { ...state.mixer, buses: [...state.mixer.buses, newBus] },
  };
}

export function setBusVolume(state: CoreState, id: string, volume: number): CoreState {
  return {
    ...state,
    mixer: {
      ...state.mixer,
      buses: state.mixer.buses.map((b) =>
        b.id === id ? { ...b, volume: clamp(volume, 0, 2) } : b,
      ),
    },
  };
}

export function setBusMute(state: CoreState, id: string, mute: boolean): CoreState {
  return {
    ...state,
    mixer: {
      ...state.mixer,
      buses: state.mixer.buses.map((b) => (b.id === id ? { ...b, mute } : b)),
    },
  };
}

export function setMasterVolume(state: CoreState, volume: number): CoreState {
  return {
    ...state,
    mixer: { ...state.mixer, masterVolume: clamp(volume, 0, 2) },
  };
}

export function play(state: CoreState): CoreState {
  return { ...state, transport: { ...state.transport, state: "playing" } };
}

export function pause(state: CoreState): CoreState {
  return {
    ...state,
    transport: {
      ...state.transport,
      state: state.transport.state === "playing" ? "paused" : state.transport.state,
    },
  };
}

export function stop(state: CoreState): CoreState {
  return { ...state, transport: { ...state.transport, state: "stopped", position: 0 } };
}

export function setPosition(state: CoreState, position: number): CoreState {
  return { ...state, transport: { ...state.transport, position: Math.max(0, position) } };
}

export function toggleMetronome(state: CoreState): CoreState {
  return {
    ...state,
    transport: {
      ...state.transport,
      metronomeEnabled: !state.transport.metronomeEnabled,
    },
  };
}
