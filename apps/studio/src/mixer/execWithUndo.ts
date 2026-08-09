import { useUndoStore } from "@kaeldaw/project/useUndoStore";
import { project } from "../stores/useCoreStore";

export function mixerExec(action: () => void) {
  const mixer = project.state.mixer;
  useUndoStore.getState().executeAction("mixer", () => ({
    channels: mixer.channels.map((ch) => ({ ...ch })),
    masterVolume: mixer.masterVolume,
  }));
  action();
}
