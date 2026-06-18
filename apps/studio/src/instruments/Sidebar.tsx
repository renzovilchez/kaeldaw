import { useWindowManager } from "../stores/WindowManager";

export function Sidebar({ width, onResize }: { width: number; onResize: (w: number) => void }) {
  const { open } = useWindowManager();

  const onMouseDown = () => {
    const onMove = (e: MouseEvent) => {
      onResize(Math.max(140, Math.min(400, e.clientX)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className="relative bg-[#333] border-r border-[#555] flex flex-col shrink-0 select-none overflow-hidden"
      style={{ width }}
    >
      <div className="h-7 border-b border-[#555] flex items-center px-3 text-[10px] text-[#888] uppercase tracking-wider shrink-0">
        Synths
      </div>

      <div className="flex-1 overflow-y-auto text-[11px]">
        <div
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors text-[#aaa] hover:bg-[#3a3a3a] hover:text-[#ddd] border-l-2 border-l-transparent"
          onClick={() => open("synth-editor")}
        >
          <span>{"🎛"}</span>
          <span className="truncate">PolySynth</span>
        </div>
      </div>

      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#3b82f6] transition-colors"
        onMouseDown={onMouseDown}
      />
    </div>
  );
}
