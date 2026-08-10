import { useEffect } from "react";
import { instrumentManager } from "../../shared/instrumentManager";
import { project } from "../../stores/useCoreStore";

export function useSyncPresetToTrack() {
  useEffect(() => {
    const unsub = instrumentManager.subscribe(() => {
      const selectedTrackId = project.state.meta.selectedTrackId;
      if (selectedTrackId) {
        const track = project.state.tracks.find((t) => t.id === selectedTrackId);
        if (track && track.presetId !== instrumentManager.selectedId) {
          project.setTrackPreset(selectedTrackId, instrumentManager.selectedId);
        }
      }
    });
    return unsub;
  }, []);
}
