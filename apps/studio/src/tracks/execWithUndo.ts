import { useTracksStore } from "@kaeldaw/project/useTracksStore";
import { useUndoStore } from "@kaeldaw/project/useUndoStore";

export function tracksExec(action: () => void) {
  const state = useTracksStore.getState();
  useUndoStore.getState().executeAction("tracks", () => ({
    tracks: state.tracks.map((t) => ({ id: t.id, name: t.name })),
  }));
  action();
}
