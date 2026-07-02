import type { ExportProgress } from "./renderProject";

export function ExportProgressDialog({
  progress,
}: {
  progress: ExportProgress | null;
}) {
  if (!progress) return null;

  return (
    <div className="fixed inset-0 z-9999 bg-black/60 flex items-center justify-center">
      <div className="bg-[#3a3a3a] rounded-lg p-6 shadow-xl w-80 text-center">
        <div className="text-sm text-[#ccc] mb-3">{progress.stage}</div>
        <div className="w-full h-2 bg-[#555] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#3b82f6] transition-all duration-200 rounded-full"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="text-xs text-[#888] mt-2">{progress.percent}%</div>
      </div>
    </div>
  );
}
