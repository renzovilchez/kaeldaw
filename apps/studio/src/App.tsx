import { useEffect, useMemo, useCallback } from "react";
import { useMixerStore } from "@kaeldaw/project/useMixerStore";
import { useCore, project } from "./stores/useCoreStore";
import { saveProjectFile, loadProjectFile } from "./stores/projectFiles";
import { TopBar } from "./app/components/TopBar";
import { TrackList } from "./tracks/TrackList";
import { MixerPanel } from "./mixer/MixerPanel";
import { FloatingWindow } from "./shared/components/FloatingWindow";
import { WindowManagerProvider } from "./shared/components/WindowManager";
import { InstrumentBrowser } from "./instruments/InstrumentBrowser";
import { SynthEditor } from "./synth-edit/SynthEditor";
import { TimelineWindow } from "./timeline/TimelineWindow";
import { PianoRollWindow } from "./piano-roll/PianoRollWindow";
import { ExportProgressDialog } from "./audio-export/ExportProgressDialog";
import { instrumentManager } from "./shared/instrumentManager";
import { usePlaybackEngine } from "./playback/usePlaybackEngine";
import { useMetronomeSync } from "./playback/useMetronomeSync";
import { useTransportBridge } from "./playback/useTransportBridge";
import { useSyncPresetToTrack } from "./instruments/hooks/useSyncPresetToTrack";
import { useExport } from "./audio-export/hooks/useExport";
import { useSidebarWidth } from "./shared/hooks/useSidebarWidth";
import {
  handleVolumeChange,
  handlePanChange,
  handleToggleMute,
  handleToggleSolo,
  handleSetMasterVolume,
  handleInsertDelay,
  handleInsertReverb,
  handleSendLevel,
  handleBusVolume,
  handleToggleBusMute,
} from "./mixer/handlers";
import {
  handleAddTrack,
  handleSelectTrack,
  handleColorChange,
} from "./tracks/handlers";

export default function App() {
  const tracks = useCore((s) => s.tracks);
  const selectedId = useCore((s) => s.meta.selectedTrackId);
  const channels = useCore((s) => s.mixer.channels);
  const buses = useCore((s) => s.mixer.buses);
  const masterVolume = useCore((s) => s.mixer.masterVolume);
  const masterMeterLevel = useMixerStore((s) => s.masterMeterLevel);
  const meterLevels = useMixerStore((s) => s.meterLevels);
  const setMeterLevel = useMixerStore((s) => s.setMeterLevel);
  const setMasterMeterLevel = useMixerStore((s) => s.setMasterMeterLevel);
  const projectName = useCore((s) => s.name);
  const metronomeEnabled = useCore((s) => s.transport.metronomeEnabled);

  const handleUndo = useCallback(() => {
    project.undo();
  }, []);

  const handleRedo = useCallback(() => {
    project.redo();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA"
      )
        return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
      if (e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo, handleRedo]);

  useTransportBridge();
  usePlaybackEngine(setMeterLevel, setMasterMeterLevel);
  useMetronomeSync(metronomeEnabled);
  useSyncPresetToTrack();

  const { exportProgress, handleExport } = useExport();
  const { sidebarWidth, handleSidebarResize } = useSidebarWidth();

  const channelMap = useMemo(
    () => new Map(channels.map((c) => [c.id, c])),
    [channels],
  );

  return (
    <WindowManagerProvider>
      <div className="h-screen bg-[#2a2a2a] text-[#ccc] text-sm select-none flex flex-col overflow-hidden">
        <TopBar
          projectName={projectName}
          onSetName={(name) => project.setName(name)}
          onSave={saveProjectFile}
          onLoad={loadProjectFile}
          onExport={handleExport}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        <div className="flex-1 flex overflow-hidden">
          <InstrumentBrowser
            width={sidebarWidth}
            onResize={handleSidebarResize}
          />

          <div className="flex-1 relative overflow-hidden">
            <FloatingWindow id="timeline" sidebarWidth={sidebarWidth}>
              <TimelineWindow />
            </FloatingWindow>

            <FloatingWindow id="piano-roll" sidebarWidth={sidebarWidth}>
              <PianoRollWindow />
            </FloatingWindow>

            <FloatingWindow id="mixer" sidebarWidth={sidebarWidth}>
              <MixerPanel
                channels={channels.map((ch) => ({
                  ...ch,
                  meterLevel: meterLevels[ch.id] ?? 0,
                  insertDelay: ch.insertFx?.[0]?.enabled ?? false,
                  insertReverb: ch.insertFx?.[1]?.enabled ?? false,
                  sendLevel:
                    ch.sends?.find((s) => s.busId === "reverb-bus")?.level ?? 0,
                }))}
                buses={buses.map((b) => ({ ...b, meterLevel: 0 }))}
                masterVolume={masterVolume}
                masterMeterLevel={masterMeterLevel}
                onVolumeChange={handleVolumeChange}
                onPanChange={handlePanChange}
                onToggleMute={handleToggleMute}
                onToggleSolo={handleToggleSolo}
                onSetMasterVolume={handleSetMasterVolume}
                onInsertDelay={handleInsertDelay}
                onInsertReverb={handleInsertReverb}
                onSendLevel={handleSendLevel}
                onBusVolume={handleBusVolume}
                onToggleBusMute={handleToggleBusMute}
              />
            </FloatingWindow>

            <FloatingWindow id="tracks" sidebarWidth={sidebarWidth}>
              <TrackList
                tracks={tracks}
                selectedId={selectedId}
                channelMap={channelMap}
                presets={
                  new Map(
                    instrumentManager.presets.map((p) => [
                      p.id,
                      { name: p.name, icon: p.icon },
                    ]),
                  )
                }
                onSelect={handleSelectTrack}
                onToggleMute={handleToggleMute}
                onToggleSolo={handleToggleSolo}
                onVolumeChange={handleVolumeChange}
                onPanChange={handlePanChange}
                onAddTrack={handleAddTrack}
                onColorChange={handleColorChange}
              />
            </FloatingWindow>

            <FloatingWindow id="synth-editor" sidebarWidth={sidebarWidth}>
              <SynthEditor />
            </FloatingWindow>
          </div>
        </div>

        <ExportProgressDialog progress={exportProgress} />
      </div>
    </WindowManagerProvider>
  );
}
