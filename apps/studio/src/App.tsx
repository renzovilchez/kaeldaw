function App() {
  return (
    <div className="min-h-screen bg-[#0d0e15] text-gray-300 font-mono text-sm select-none">
      {/* Top bar */}
      <div className="h-10 bg-[#14151f] border-b border-gray-800 flex items-center px-3 gap-4">
        <span className="text-cyan-400 font-bold tracking-tight">KaelDAW</span>
        <div className="h-4 w-px bg-gray-700" />
        <button className="hover:text-white transition-colors">File</button>
        <button className="hover:text-white transition-colors">Edit</button>
        <button className="hover:text-white transition-colors">View</button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-gray-500">REC</span>
        </div>
      </div>

      {/* Transport bar */}
      <div className="h-12 bg-[#1a1b26] border-b border-gray-800 flex items-center px-4 gap-3">
        <button className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-white">
          ▶
        </button>
        <button className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
          ⏹
        </button>
        <div className="h-6 w-px bg-gray-700 mx-1" />
        <div className="bg-black px-3 py-1 rounded font-mono text-cyan-400 text-xs tracking-widest">
          00:00:00:00
        </div>
        <div className="flex-1" />
        <div className="text-xs text-gray-600">120 BPM | 4/4 | Cmaj</div>
      </div>

      {/* Main workspace */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Track headers */}
        <div className="w-48 bg-[#14151f] border-r border-gray-800 flex flex-col">
          <div className="h-8 border-b border-gray-800 flex items-center px-2 text-xs text-gray-500 uppercase tracking-wider">
            Tracks
          </div>

          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-16 border-b border-gray-800 p-2 flex flex-col gap-1 group hover:bg-[#1a1b26]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Track {n}</span>
                <button className="w-4 h-4 bg-gray-700 rounded-sm text-[8px] flex items-center justify-center text-gray-400 group-hover:bg-gray-600">
                  M
                </button>
              </div>
              <div className="flex gap-1">
                <div className="h-4 flex-1 bg-gray-800 rounded-sm overflow-hidden">
                  <div className="h-full w-[30%] bg-purple-500/40" />
                </div>
              </div>
            </div>
          ))}

          <button className="m-2 py-1 px-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400 text-left">
            + Add track
          </button>
        </div>

        {/* Timeline / Grid */}
        <div className="flex-1 bg-[#0d0e15] relative overflow-hidden">
          {/* Time ruler */}
          <div className="h-8 border-b border-gray-800 flex">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-gray-800/50 flex items-end justify-center pb-1"
              >
                <span className="text-[10px] text-gray-600">{i + 1}</span>
              </div>
            ))}
          </div>

          {/* Grid lines */}
          <div className="absolute inset-0 top-8 pointer-events-none">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 border-b border-gray-800/30" />
            ))}
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 left-30 w-px bg-cyan-400/60 z-10">
              <div
                className="absolute -top-1 -left-1 w-2 h-2 bg-cyan-400"
                style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
              />
            </div>
          </div>

          {/* Clips on track 1 */}
          <div className="absolute top-2.5 left-10 h-12 w-35 bg-cyan-900/30 border border-cyan-700/40 rounded-sm flex items-center px-2">
            <span className="text-[10px] text-cyan-300/60">bass.mid</span>
          </div>

          {/* Clips on track 3 */}
          <div className="absolute top-34.5 left-50 h-12 w-50 bg-purple-900/30 border border-purple-700/40 rounded-sm flex items-center px-2">
            <span className="text-[10px] text-purple-300/60">pad.wav</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
