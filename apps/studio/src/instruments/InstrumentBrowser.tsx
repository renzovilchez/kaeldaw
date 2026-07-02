import { useSyncExternalStore, useCallback, useState } from "react";
import { instrumentManager } from "../shared/instrumentManager";
import { useWindowManager } from "../shared/components/useWindowManager";

export function InstrumentBrowser({
  width,
  onResize,
}: {
  width: number;
  onResize: (w: number) => void;
}) {
  const presets = useSyncExternalStore(
    instrumentManager.subscribe.bind(instrumentManager),
    () => instrumentManager.presets,
  );
  const selectedId = useSyncExternalStore(
    instrumentManager.subscribe.bind(instrumentManager),
    () => instrumentManager.selectedId,
  );
  const { open } = useWindowManager();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [resizing, setResizing] = useState(false);

  const toggleCategory = useCallback((cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      instrumentManager.selectPreset(id);
      open("synth-editor");
    },
    [open],
  );

  const handleLoadSample = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/wav,audio/ogg,audio/mp3,audio/mpeg";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const { SampleCache } =
          await import("@kaeldaw/instruments/SampleCache");
        const sampleId = await SampleCache.loadFromFile(file);
        const name = file.name.replace(/\.[^.]+$/, "");
        instrumentManager.saveCustomPreset(name, "sampler", sampleId);
      } catch (err) {
        console.error("Failed to load sample:", err);
      }
    };
    input.click();
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      setResizing(true);
      const startX = e.clientX;
      const startW = width;
      const onMove = (ev: MouseEvent) => {
        const newW = Math.max(120, Math.min(400, startW + ev.clientX - startX));
        onResize(newW);
      };
      const onUp = () => {
        setResizing(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [width, onResize],
  );

  const groups: Record<string, typeof presets> = {};
  for (const p of presets) {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  }

  return (
    <div
      className="h-full bg-[#2f2f2f] flex flex-col shrink-0 overflow-hidden"
      style={{ width, cursor: resizing ? "col-resize" : undefined }}
    >
      <div className="h-7 border-b border-[#4a4a4a] flex items-center px-3 text-[10px] text-[#888] uppercase tracking-wider shrink-0">
        Instruments
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden text-[11px]">
        {Object.entries(groups).map(([cat, items]) => (
          <div key={cat}>
            <div
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#999] uppercase tracking-wider cursor-pointer hover:bg-[#3a3a3a] select-none"
              onClick={() => toggleCategory(cat)}
            >
              <span className="text-[8px]">{collapsed[cat] ? "▶" : "▼"}</span>
              <span>{cat}</span>
              <span className="text-[#666] ml-auto">({items.length})</span>
            </div>
            {!collapsed[cat] &&
              items.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1 cursor-pointer transition-colors ${
                    p.id === selectedId
                      ? "bg-[#3b82f6] text-white"
                      : "hover:bg-[#3a3a3a] text-[#ccc]"
                  }`}
                  onClick={() => handleSelect(p.id)}
                >
                  <span className="text-[13px]">{p.icon}</span>
                  <span className="truncate">{p.name}</span>
                  {p.engine === "sampler" && (
                    <span className="text-[8px] text-[#999] ml-auto">SF</span>
                  )}
                </div>
              ))}
          </div>
        ))}
      </div>
      <div className="border-t border-[#4a4a4a] p-2 shrink-0">
        <button
          className="w-full py-1 rounded bg-[#4a4a4a] hover:bg-[#555] text-[11px] text-[#ccc] transition-colors"
          onClick={handleLoadSample}
        >
          + Load Sample
        </button>
      </div>
      <div
        className="absolute top-0 bottom-0 right-0 w-1 cursor-col-resize hover:bg-[#3b82f6] transition-colors"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
