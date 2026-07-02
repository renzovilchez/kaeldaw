export function Arrangement({ hasTracks }: { hasTracks: boolean }) {
  return (
    <div className="flex-1 bg-[#11121a] flex flex-col">
      <div className="h-7 border-b border-gray-800 flex bg-[#0d0e15] shrink-0">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-r border-gray-800/50 flex items-end justify-center pb-1"
          >
            <span className="text-[8px] text-gray-600">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center text-[10px] text-gray-600 italic">
        {hasTracks ? "Arrangement view — coming in F1" : "Add a track to begin"}
      </div>
    </div>
  );
}
