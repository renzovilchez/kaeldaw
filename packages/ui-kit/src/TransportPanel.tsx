import { Transport } from "@kaeldaw/audio-engine/Transport";

function formatPosition(): string {
  const ppqn = Transport.ppqn;
  const beatsPerBar = Transport.timeSignature.beats;
  const ticksPerBar = ppqn * beatsPerBar;
  const bar = Math.floor(Transport.position / ticksPerBar) + 1;
  const beat = Math.floor((Transport.position % ticksPerBar) / ppqn) + 1;
  const tick = Transport.position % ppqn;
  const pad = (n: number, d: number) => String(n).padStart(d, "0");
  return `${pad(bar, 3)}:${pad(beat, 2)}:${pad(tick, 3)}`;
}

export function TransportPanel() {
  const PlayingIcon = "\u23F8";
  const StoppedIcon = "\u25B6";
  const isPlaying = Transport.state === "playing";

  const handlePlay = () => {
    if (isPlaying) {
      Transport.pause();
    } else {
      Transport.play();
    }
  };

  const handleStop = () => {
    Transport.stop();
  };

  return (
    <div className="flex items-center gap-3 h-12 px-4 bg-[#1a1b26] border-b border-gray-800 text-sm font-mono select-none">
      <button
        data-testid="play-btn"
        className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white text-xs"
        onClick={handlePlay}
      >
        {isPlaying ? PlayingIcon : StoppedIcon}
      </button>
      <button
        data-testid="stop-btn"
        className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-gray-400 text-xs"
        onClick={handleStop}
      >
        {"\u23F9"}
      </button>
      <div className="h-6 w-px bg-gray-700" />
      <div
        data-testid="position-display"
        className="bg-black px-3 py-1 rounded font-mono text-cyan-400 text-xs tracking-widest"
      >
        {formatPosition()}
      </div>
      <div className="flex-1" />
      <div data-testid="bpm-display" className="text-xs text-gray-600">
        {Transport.bpm} BPM | {Transport.timeSignature.beats}/
        {Transport.timeSignature.beatValue}
      </div>
    </div>
  );
}
