import {
  getVersion,
  type ProjectMidiNote,
  type ProjectSchema,
} from "../schema";
import type {
  CoreClip,
  CoreMidiNote,
  CoreState,
  TimeSignature,
} from "./types";
import { createProject } from "./commands";

export function timeSignatureToString(ts: TimeSignature): string {
  return `${ts.beats}/${ts.beatValue}`;
}

export function timeSignatureFromString(value: string): TimeSignature {
  const match = /^(\d+)\/(\d+)$/.exec(value);
  if (!match) return { beats: 4, beatValue: 4 };
  return { beats: Number(match[1]), beatValue: Number(match[2]) };
}

export function toSchema(state: CoreState): ProjectSchema {
  return {
    version: getVersion(),
    name: state.name,
    bpm: state.bpm,
    timeSignature: timeSignatureToString(state.timeSignature),
    ppqn: state.ppqn,
    tracks: state.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      presetId: t.presetId,
      presetEngine: t.presetEngine,
      sampleId: t.sampleId,
    })),
    mixerChannels: state.mixer.channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      volume: ch.volume,
      pan: ch.pan,
      mute: ch.mute,
      solo: ch.solo,
      insertFx: ch.insertFx,
      sends: ch.sends,
      busId: ch.busId,
    })),
    buses: state.mixer.buses.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      volume: b.volume,
      pan: b.pan,
      mute: b.mute,
      insertFx: b.insertFx,
    })),
    masterVolume: state.mixer.masterVolume,
    clips: state.clips.map((c) => ({
      id: c.id,
      trackIndex: c.trackIndex,
      trackId: c.trackId,
      startTick: c.startTick,
      durationTicks: c.durationTicks,
      color: c.color,
      name: c.name,
      notes: c.notes.map((n) => ({ ...n })),
      startOffset: c.startOffset,
    })),
    midiNotes: {},
  };
}

export function fromSchema(schema: ProjectSchema): CoreState {
  const state = createProject({
    name: schema.name,
    bpm: schema.bpm,
    timeSignature: timeSignatureFromString(schema.timeSignature),
    ppqn: schema.ppqn,
  });

  const tracks = schema.tracks.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color ?? "#22d3ee",
    presetId: t.presetId ?? "poly-saw",
    presetEngine: t.presetEngine ?? "synth",
    sampleId: t.sampleId ?? undefined,
  }));

  const clips: CoreClip[] = schema.clips.map((c) => ({
    id: c.id,
    trackId: c.trackId,
    trackIndex: c.trackIndex,
    startTick: c.startTick,
    durationTicks: c.durationTicks,
    color: c.color,
    name: c.name,
    notes: (c.notes ?? []).map((n) => ({ ...n })),
    startOffset: c.startOffset ?? 0,
  }));

  const midiNotes = schema.midiNotes ?? {};
  for (const clipIdStr of Object.keys(midiNotes)) {
    const clipId = Number(clipIdStr);
    const notes = midiNotes[clipId] as ProjectMidiNote[] | undefined;
    if (!notes) continue;
    const clip = clips.find((c) => c.id === clipId);
    if (clip) {
      clip.notes = notes.map((n) => ({ ...n }));
    }
  }

  const buses =
    schema.buses.length > 0
      ? schema.buses.map((b) => ({
          id: b.id,
          name: b.name,
          type: b.type,
          volume: b.volume,
          pan: b.pan,
          mute: b.mute,
          insertFx:
            b.insertFx ??
            [
              { type: "delay" as const, enabled: false, wet: 0.3 },
              { type: "reverb" as const, enabled: false, wet: 0.3 },
            ],
        }))
      : [
          {
            id: "reverb-bus",
            name: "Reverb",
            type: "aux" as const,
            volume: 0.8,
            pan: 0,
            mute: false,
            insertFx: [{ type: "reverb" as const, enabled: true, wet: 1 }],
          },
          {
            id: "delay-bus",
            name: "Delay",
            type: "aux" as const,
            volume: 0.8,
            pan: 0,
            mute: false,
            insertFx: [{ type: "delay" as const, enabled: true, wet: 1 }],
          },
        ];

  const channels = schema.mixerChannels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    volume: ch.volume,
    pan: ch.pan,
    mute: ch.mute,
    solo: ch.solo ?? false,
    insertFx:
      ch.insertFx ??
      [
        { type: "delay" as const, enabled: false, wet: 0.3 },
        { type: "reverb" as const, enabled: false, wet: 0.3 },
      ],
    sends:
      ch.sends ??
      [
        { busId: "reverb-bus", level: 0 },
        { busId: "delay-bus", level: 0 },
      ],
    busId: ch.busId,
  }));

  const maxClipId = clips.reduce((max, c) => Math.max(max, c.id), 0);
  const maxNoteId = clips.reduce(
    (max, c) => c.notes.reduce((m, n) => Math.max(m, n.id), max),
    0,
  );

  return {
    ...state,
    tracks,
    clips,
    mixer: {
      channels,
      buses,
      masterVolume: schema.masterVolume ?? 0.8,
    },
    meta: {
      ...state.meta,
      nextClipId: maxClipId + 1,
      nextNoteId: maxNoteId + 1,
    },
  };
}

export function collectMidiNotes(
  clips: CoreClip[],
): Map<number, CoreMidiNote[]> {
  const map = new Map<number, CoreMidiNote[]>();
  for (const clip of clips) {
    if (clip.notes.length > 0) {
      map.set(clip.id, clip.notes.map((n) => ({ ...n })));
    }
  }
  return map;
}
