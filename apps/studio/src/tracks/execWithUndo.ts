import { useUndoStore } from "@kaeldaw/project/useUndoStore";
import { project } from "../stores/useCoreStore";

export function tracksExec(action: () => void) {
  const tracks = project.state.tracks;
  useUndoStore.getState().executeAction("tracks", () => ({
    tracks: tracks.map((t) => ({ id: t.id, name: t.name, color: t.color })),
  }));
  action();
}
