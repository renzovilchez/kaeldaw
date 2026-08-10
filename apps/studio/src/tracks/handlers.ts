import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { instrumentManager } from "../shared/instrumentManager";
import { project } from "../stores/useCoreStore";

export function handleAddTrack() {
  const name = `Track ${project.state.tracks.length + 1}`;
  const id = project.addTrack(name);
  const track = project.state.tracks.find((t) => t.id === id);
  if (track) project.addChannel({ id: track.id, name: track.name });
}

export function handleSelectTrack(id: string) {
  project.selectTrack(id);
  const track = project.state.tracks.find((t) => t.id === id);
  if (track) {
    instrumentManager.selectPreset(track.presetId);
    if (track.presetEngine === "sampler" && track.sampleId) {
      import("@kaeldaw/instruments/SampleCache").then(({ SampleCache }) => {
        const data = SampleCache.get(track.sampleId!);
        if (data) {
          const meta = SampleCache.getMeta(track.sampleId!);
          PolySynthOutput.loadSample(
            track.sampleId!,
            data,
            meta?.sampleRate ?? 44100,
          );
        }
      });
    }
  }
}

export function handleColorChange(id: string, color: string) {
  project.setTrackColor(id, color);
}
