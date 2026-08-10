import { useState } from "react";
import { createDownloadLink, revokeDownloadLink } from "@kaeldaw/project/wav-export";
import { renderProject } from "../renderProject";
import type { ExportProgress } from "../renderProject";
import { useCore } from "../../stores/useCoreStore";

export function useExport() {
  const projectName = useCore((s) => s.name);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  const handleExport = async () => {
    setExportProgress({ percent: 0, stage: "Starting..." });
    try {
      const result = await renderProject(44100, (p) => setExportProgress({ ...p }));
      if (result.master) {
        const a = createDownloadLink(result.master, `${projectName}.wav`);
        a.click();
        revokeDownloadLink(a);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExportProgress(null);
    }
  };

  return { exportProgress, handleExport };
}
