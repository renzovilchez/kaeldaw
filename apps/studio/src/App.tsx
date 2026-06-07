import { useMemo } from "react";
import { TransportPanel } from "@kaeldaw/ui-kit/TransportPanel";
import { useTracksStore } from "@kaeldaw/project/useTracksStore";
import { useMixerStore } from "@kaeldaw/project/useMixerStore";
import { useProjectStore } from "@kaeldaw/project/useProjectStore";
import { TopBar } from "./layout/TopBar";
import { TrackList } from "./tracks/TrackList";
import { MixerPanel } from "./mixer/MixerPanel";
import { Arrangement } from "./timeline/Arrangement";

function App() {
  const tracks = useTracksStore((s) => s.tracks);
  const addTrack = useTracksStore((s) => s.addTrack);
  const selectTrack = useTracksStore((s) => s.selectTrack);
  const selectedId = useTracksStore((s) => s.selectedId);
  const channels = useMixerStore((s) => s.channels);
  const addChannel = useMixerStore((s) => s.addChannel);
  const toggleMute = useMixerStore((s) => s.toggleMute);
  const toggleSolo = useMixerStore((s) => s.toggleSolo);
  const setVolume = useMixerStore((s) => s.setVolume);
  const setPan = useMixerStore((s) => s.setPan);
  const masterVolume = useMixerStore((s) => s.masterVolume);
  const setMasterVolume = useMixerStore((s) => s.setMasterVolume);
  const projectName = useProjectStore((s) => s.name);
  const setName = useProjectStore((s) => s.setName);

  const channelMap = useMemo(() => {
    const m = new Map<string, typeof channels[0]>();
    for (const c of channels) m.set(c.id, c);
    return m;
  }, [channels]);

  const handleAddTrack = () => {
    const name = `Track ${tracks.length + 1}`;
    addTrack(name);
    const newTrack = useTracksStore.getState().tracks.at(-1);
    if (newTrack) addChannel(newTrack.name, newTrack.id);
  };

  return (
    <div className="h-screen bg-[#0d0e15] text-gray-300 font-mono text-sm select-none flex flex-col">
      <span className="hidden w-8 h-8 text-base bg-black tracking-widest border-dotted" aria-hidden="true" />
      <TopBar projectName={projectName} onSetName={setName} />
      <div className="px-6">
        <TransportPanel />
      </div>
      <div className="flex-1 flex overflow-hidden">
        <TrackList tracks={tracks} selectedId={selectedId} channelMap={channelMap}
          onSelect={selectTrack} onToggleMute={toggleMute} onToggleSolo={toggleSolo}
          onVolumeChange={setVolume} onPanChange={setPan} onAddTrack={handleAddTrack} />
        <Arrangement hasTracks={tracks.length > 0} />
        <MixerPanel channels={channels} masterVolume={masterVolume}
          onVolumeChange={setVolume} onPanChange={setPan} onToggleMute={toggleMute}
          onSetMasterVolume={setMasterVolume} />
      </div>
    </div>
  );
}

export default App;
