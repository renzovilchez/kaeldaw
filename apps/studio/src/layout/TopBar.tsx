export function TopBar({ projectName, onSetName }: {
  projectName: string;
  onSetName: (name: string) => void;
}) {
  return (
    <div className="h-8 bg-[#14151f] border-b border-gray-800 flex items-center px-3 gap-4 shrink-0">
      <span className="text-cyan-400 font-bold tracking-tight text-xs">KaelDAW</span>
      <div className="h-3 w-px bg-gray-700" />
      <input
        className="bg-transparent text-[10px] text-gray-500 outline-none border-b border-transparent hover:border-gray-600 focus:border-cyan-500 focus:text-gray-200 w-36"
        value={projectName}
        onChange={(e) => onSetName(e.target.value)}
        title="Project name"
      />
      <div className="flex-1" />
    </div>
  );
}
