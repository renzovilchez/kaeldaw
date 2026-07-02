import { useMixerStore } from "@kaeldaw/project/useMixerStore";
import { useUndoStore } from "@kaeldaw/project/useUndoStore";

export function mixerExec(action: () => void) {
  const state = useMixerStore.getState();
  useUndoStore.getState().executeAction("mixer", () => ({
    channels: state.channels.map((ch) => ({ ...ch })),
    masterVolume: state.masterVolume,
  }));
  action();
}
