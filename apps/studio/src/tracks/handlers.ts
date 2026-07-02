import { useTracksStore } from "@kaeldaw/project/useTracksStore";
import { useMixerStore } from "@kaeldaw/project/useMixerStore";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { instrumentManager } from "../shared/instrumentManager";
import { tracksExec } from "./execWithUndo";

export function handleAddTrack() {
  tracksExec(() => {
    const tracks = useTracksStore.getState().tracks;
    const name = `Track ${tracks.length + 1}`;
    useTracksStore.getState().addTrack(name);
    const newTrack = useTracksStore.getState().tracks.at(-1);
    if (newTrack)
      useMixerStore.getState().addChannel(newTrack.name, newTrack.id);
  });
}

export function handleSelectTrack(id: string) {
  useTracksStore.getState().selectTrack(id);
  const track = useTracksStore.getState().tracks.find((t) => t.id === id);
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
  useTracksStore.getState().setTrackColor(id, color);
}
