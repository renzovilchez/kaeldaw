import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { project } from "../stores/useCoreStore";

export function handleVolumeChange(id: string, v: number) {
  project.setChannelVolume(id, v);
}

export function handlePanChange(id: string, v: number) {
  project.setChannelPan(id, v);
}

export function handleToggleMute(id: string) {
  const ch = project.state.mixer.channels.find((c) => c.id === id);
  project.setChannelMute(id, !ch?.mute);
}

export function handleToggleSolo(id: string) {
  const ch = project.state.mixer.channels.find((c) => c.id === id);
  project.setChannelSolo(id, !ch?.solo);
}

export function handleSetMasterVolume(v: number) {
  project.setMasterVolume(v);
}

export function handleInsertDelay(channelId: string, enabled: boolean) {
  project.setChannelInsertFx(channelId, "delay", enabled, 0.3);
  PolySynthOutput.setChannelInsertFx(channelId, "delay", enabled, 0.3);
}

export function handleInsertReverb(channelId: string, enabled: boolean) {
  project.setChannelInsertFx(channelId, "reverb", enabled, 0.3);
  PolySynthOutput.setChannelInsertFx(channelId, "reverb", enabled, 0.3);
}

export function handleSendLevel(channelId: string, level: number) {
  project.setChannelSend(channelId, "reverb-bus", level);
  PolySynthOutput.setChannelSendLevel(channelId, level);
}

export function handleBusVolume(busId: string, volume: number) {
  project.setBusVolume(busId, volume);
}

export function handleToggleBusMute(busId: string) {
  const bus = project.state.mixer.buses.find((b) => b.id === busId);
  project.setBusMute(busId, !bus?.mute);
}
