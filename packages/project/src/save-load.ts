import { getVersion, type ProjectSchema } from "./schema";
import { useProjectStore } from "./useProjectStore";
import { useTracksStore } from "./useTracksStore";
import { useMixerStore } from "./useMixerStore";
import { useClipsStore } from "./useClipsStore";
import { useMidiStore } from "./useMidiStore";
import { saveToBlob, loadFromBlob } from "./kaeldaw";

export function buildProjectSchema(): ProjectSchema {
  const project = useProjectStore.getState();
  const tracks = useTracksStore.getState();
  const mixer = useMixerStore.getState();
  const clips = useClipsStore.getState();

  return {
    version: getVersion(),
    name: project.name,
    bpm: project.bpm,
    timeSignature: project.timeSignature,
    ppqn: project.ppqn,
    tracks: tracks.tracks.map((t) => ({ id: t.id, name: t.name, color: t.color, presetId: t.presetId })),
    mixerChannels: mixer.channels.map((ch) => ({
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
    buses: mixer.buses.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      volume: b.volume,
      pan: b.pan,
      mute: b.mute,
      insertFx: b.insertFx,
    })),
    masterVolume: mixer.masterVolume,
    clips: clips.clips.map((c) => ({
      id: c.id, trackIndex: c.trackIndex, trackId: c.trackId,
      startTick: c.startTick, durationTicks: c.durationTicks, color: c.color, name: c.name,
      notes: c.notes.map((n) => ({ ...n })),
      startOffset: c.startOffset,
    })),
    midiNotes: {},
  };
}

export function loadProjectSchema(schema: ProjectSchema): void {
  useProjectStore.getState().loadFromSchema(schema);
  useTracksStore.setState({
    tracks: schema.tracks.map((t) => ({ ...t, color: t.color ?? "#22d3ee", presetId: t.presetId ?? "poly-saw" })),
    selectedId: null,
  });
  useMixerStore.setState({
    channels: schema.mixerChannels.map((ch) => ({
      ...ch,
      meterLevel: 0,
      insertFx: ch.insertFx ?? [{ type: "delay", enabled: false, wet: 0.3 }, { type: "reverb", enabled: false, wet: 0.3 }],
      sends: ch.sends ?? [{ busId: "reverb-bus", level: 0 }, { busId: "delay-bus", level: 0 }],
      busId: ch.busId ?? undefined,
    })),
    buses: schema.buses.length > 0
      ? schema.buses.map((b) => ({
          ...b,
          meterLevel: 0,
          insertFx: b.insertFx ?? [{ type: "delay", enabled: false, wet: 0.3 }, { type: "reverb", enabled: false, wet: 0.3 }],
        }))
      : [
          { id: "reverb-bus", name: "Reverb", type: "aux" as const, volume: 0.8, pan: 0, mute: false, insertFx: [{ type: "reverb", enabled: true, wet: 1 }], meterLevel: 0 },
          { id: "delay-bus", name: "Delay", type: "aux" as const, volume: 0.8, pan: 0, mute: false, insertFx: [{ type: "delay", enabled: true, wet: 1 }], meterLevel: 0 },
        ],
    masterVolume: schema.masterVolume,
  });
  useClipsStore.getState().setClips(schema.clips.map((c) => ({ ...c, startOffset: c.startOffset ?? 0 })));
  useMidiStore.getState().clear();
}

export async function saveProjectFile(): Promise<void> {
  const schema = buildProjectSchema();
  const blob = await saveToBlob(schema);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${schema.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.kaeldaw`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadProjectFile(file: File): Promise<void> {
  const schema = await loadFromBlob(file);
  loadProjectSchema(schema);
}
