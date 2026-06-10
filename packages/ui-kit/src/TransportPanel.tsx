import { useTransportStore } from "@kaeldaw/project/useTransportStore";

function formatPosition(
  position: number,
  ppqn: number,
  beatsPerBar: number,
): string {
  const ticksPerBar = ppqn * beatsPerBar;
  const bar = Math.floor(position / ticksPerBar) + 1;
  const beat = Math.floor((position % ticksPerBar) / ppqn) + 1;
  const tick = position % ppqn;
  const pad = (n: number, d: number) => String(n).padStart(d, "0");
  return `${pad(bar, 3)}:${pad(beat, 2)}:${pad(tick, 3)}`;
}

export function TransportPanel() {
  const state = useTransportStore((s) => s.state);
  const position = useTransportStore((s) => s.position);
  const ppqn = useTransportStore((s) => s.ppqn);
  const ts = useTransportStore((s) => s.timeSignature);
  const play = useTransportStore((s) => s.play);
  const pause = useTransportStore((s) => s.pause);
  const stop = useTransportStore((s) => s.stop);

  const isPlaying = state === "playing";

  return (
    <div className="h-10 bg-[#3a3a3a] flex items-center px-5 gap-5 select-none border-b border-[#555]">
      <button
        data-testid="play-btn"
        className="w-7 h-7 flex items-center justify-center bg-[#4a4a4a] hover:bg-[#555] active:bg-[#666] rounded text-white text-sm"
        onClick={() => { if (isPlaying) pause(); else play(); }}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "\u23F8" : "\u25B6"}
      </button>
      <button
        data-testid="stop-btn"
        className="w-7 h-7 flex items-center justify-center bg-[#4a4a4a] hover:bg-[#555] active:bg-[#666] rounded text-[#999] text-sm"
        onClick={stop}
        title="Stop"
      >
        {"\u23F9"}
      </button>
      <div className="h-5 w-px bg-[#555]" />
      <span className="text-[9px] text-[#888] uppercase tracking-wider">Pos</span>
      <div
        data-testid="position-display"
        className="bg-[#2a2a2a] px-2.5 py-1 rounded font-mono text-[#3b82f6] text-[11px] tracking-widest"
        title="Bars:Beats:Ticks"
      >
        {formatPosition(position, ppqn, ts.beats)}
      </div>
      <span className="text-[9px] text-[#666] ml-auto">{state}</span>
    </div>
  );
}
