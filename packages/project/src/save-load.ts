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
    channels: schema.mixerChannels.map((ch) => ({ ...ch, meterLevel: 0 })),
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
