import { useEffect } from "react";
import { useTracksStore } from "@kaeldaw/project/useTracksStore";
import { instrumentManager } from "../../shared/instrumentManager";

export function useSyncPresetToTrack() {
  useEffect(() => {
    const unsub = instrumentManager.subscribe(() => {
      const selectedTrackId = useTracksStore.getState().selectedId;
      if (selectedTrackId) {
        const track = useTracksStore.getState().tracks.find((t) => t.id === selectedTrackId);
        if (track && track.presetId !== instrumentManager.selectedId) {
          useTracksStore.getState().setTrackPreset(selectedTrackId, instrumentManager.selectedId);
        }
      }
    });
    return unsub;
  }, []);
}
