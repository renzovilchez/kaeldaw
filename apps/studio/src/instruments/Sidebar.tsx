import { useRef, useSyncExternalStore } from "react";
import { instrumentManager } from "../stores/useInstrumentStore";

export function Sidebar({ width, onResize }: { width: number; onResize: (w: number) => void }) {
  const presets = instrumentManager.presets;
  const selectedId = useSyncExternalStore(
    instrumentManager.subscribe.bind(instrumentManager),
    () => instrumentManager.selectedId,
  );
  const collapsed = useSyncExternalStore(
    instrumentManager.subscribe.bind(instrumentManager),
    () => instrumentManager.collapsed,
  );

  const resizing = useRef(false);

  const categories = [...new Set(presets.map((p) => p.category))];

  const onMouseDown = () => {
    resizing.current = true;
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      onResize(Math.max(140, Math.min(400, e.clientX)));
    };
    const onUp = () => {
      resizing.current = false;
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
        Instruments
      </div>

      <div className="flex-1 overflow-y-auto text-[11px]">
        {categories.map((cat) => {
          const isCollapsed = collapsed[cat];
          const items = presets.filter((p) => p.category === cat);
          return (
            <div key={cat}>
              <div
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] text-[#999] uppercase tracking-wider cursor-pointer hover:text-[#ccc] sticky top-0 bg-[#333] border-b border-[#444]"
                onClick={() => instrumentManager.toggleCategory(cat)}
              >
                <span className="text-xs">{isCollapsed ? "\u25B6" : "\u25BC"}</span>
                {cat}
                <span className="text-[#555] ml-auto">{items.length}</span>
              </div>
              {!isCollapsed && items.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                    selectedId === p.id
                      ? "bg-[#3b82f6]/20 text-white border-l-2 border-l-[#3b82f6]"
                      : "text-[#aaa] hover:bg-[#3a3a3a] hover:text-[#ddd] border-l-2 border-l-transparent"
                  }`}
                  onClick={() => instrumentManager.selectPreset(p.id)}
                  title={p.name}
                >
                  <span>{p.icon}</span>
                  <span className="truncate">{p.name}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#3b82f6] transition-colors"
        onMouseDown={onMouseDown}
      />
    </div>
  );
}
