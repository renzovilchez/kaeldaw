import { useMixerStore } from "@kaeldaw/project/useMixerStore";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { mixerExec } from "./execWithUndo";

export function handleVolumeChange(id: string, v: number) {
  mixerExec(() => useMixerStore.getState().setVolume(id, v));
}

export function handlePanChange(id: string, v: number) {
  mixerExec(() => useMixerStore.getState().setPan(id, v));
}

export function handleToggleMute(id: string) {
  mixerExec(() => useMixerStore.getState().toggleMute(id));
}

export function handleToggleSolo(id: string) {
  mixerExec(() => useMixerStore.getState().toggleSolo(id));
}

export function handleSetMasterVolume(v: number) {
  mixerExec(() => useMixerStore.getState().setMasterVolume(v));
}

export function handleInsertDelay(channelId: string, enabled: boolean) {
  mixerExec(() =>
    useMixerStore.getState().setInsertFxEnabled(channelId, 0, enabled),
  );
  PolySynthOutput.setChannelInsertFx(channelId, "delay", enabled, 0.3);
}

export function handleInsertReverb(channelId: string, enabled: boolean) {
  mixerExec(() =>
    useMixerStore.getState().setInsertFxEnabled(channelId, 1, enabled),
  );
  PolySynthOutput.setChannelInsertFx(channelId, "reverb", enabled, 0.3);
}

export function handleSendLevel(channelId: string, level: number) {
  mixerExec(() =>
    useMixerStore.getState().setSendLevel(channelId, "reverb-bus", level),
  );
  PolySynthOutput.setChannelSendLevel(channelId, level);
}

export function handleBusVolume(busId: string, volume: number) {
  mixerExec(() => useMixerStore.getState().setBusVolume(busId, volume));
}

export function handleToggleBusMute(busId: string) {
  mixerExec(() => useMixerStore.getState().toggleBusMute(busId));
}
