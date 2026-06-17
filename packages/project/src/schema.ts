const SCHEMA_VERSION = "0.1.0";

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaValidationError";
  }
}

export interface ProjectTrack {
  id: string;
  name: string;
}

export interface ProjectMixerChannel {
  id: string;
  name: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
}

export interface ProjectClip {
  id: number;
  trackIndex: number;
  trackId: string;
  startTick: number;
  durationTicks: number;
  color: string;
  name: string;
  notes: { id: number; note: number; startTick: number; durationTicks: number; velocity: number; color?: string }[];
  startOffset?: number;
}

export interface ProjectMidiNote {
  id: number;
  note: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
  color?: string;
}

export interface ProjectSchema {
  version: string;
  name: string;
  bpm: number;
  timeSignature: string;
  ppqn: number;
  tracks: ProjectTrack[];
  mixerChannels: ProjectMixerChannel[];
  masterVolume: number;
  clips: ProjectClip[];
  midiNotes: Record<number, ProjectMidiNote[]>;
}

function isSemver(s: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(s);
}

function isTimeSignature(s: string): boolean {
  return /^\d+\/\d+$/.test(s);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deserialize(json: string): ProjectSchema {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new SchemaValidationError("Invalid JSON");
  }

  if (!isRecord(parsed)) {
    throw new SchemaValidationError("Root must be an object");
  }

  const version = parsed.version;
  if (typeof version !== "string" || !isSemver(version)) {
    throw new SchemaValidationError(`Invalid version: ${String(version)}`);
  }

  const [major] = version.split(".").map(Number);
  const [currentMajor] = SCHEMA_VERSION.split(".").map(Number);
  if (major !== currentMajor) {
    throw new SchemaValidationError(
      `Unsupported version ${version}. Expected major version ${currentMajor}`
    );
  }

  const name = parsed.name;
  if (typeof name !== "string" || name.trim() === "") {
    throw new SchemaValidationError("name must be a non-empty string");
  }

  const bpm = parsed.bpm;
  if (typeof bpm !== "number" || isNaN(bpm) || bpm < 20 || bpm > 300) {
    throw new SchemaValidationError("bpm must be a number between 20 and 300");
  }

  const timeSignature = parsed.timeSignature;
  if (typeof timeSignature !== "string" || !isTimeSignature(timeSignature)) {
    throw new SchemaValidationError(
      "timeSignature must be in format X/Y (e.g. 4/4)"
    );
  }

  const ppqn = parsed.ppqn;
  if (typeof ppqn !== "number" || !Number.isInteger(ppqn) || ppqn <= 0) {
    throw new SchemaValidationError("ppqn must be a positive integer");
  }

  if (!Array.isArray(parsed.tracks)) {
    throw new SchemaValidationError("tracks must be an array");
  }

  return {
    version,
    name: name.trim(),
    bpm,
    timeSignature,
    ppqn,
    tracks: parsed.tracks,
    mixerChannels: Array.isArray(parsed.mixerChannels) ? parsed.mixerChannels : [],
    masterVolume: typeof parsed.masterVolume === "number" ? parsed.masterVolume : 1,
    clips: Array.isArray(parsed.clips) ? parsed.clips : [],
    midiNotes: parsed.midiNotes && typeof parsed.midiNotes === "object" && !Array.isArray(parsed.midiNotes)
      ? parsed.midiNotes as Record<number, ProjectMidiNote[]>
      : {},
  };
}

export function serialize(project: ProjectSchema): string {
  return JSON.stringify(project, null, 2);
}

export function getVersion(): string {
  return SCHEMA_VERSION;
}
