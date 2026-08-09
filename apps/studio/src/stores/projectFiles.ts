import { saveToBlob, loadFromBlob } from "@kaeldaw/project/kaeldaw";
import { project } from "./useCoreStore";

export async function saveProjectFile(): Promise<void> {
  const schema = project.toSchema();
  const { SampleCache } = await import("@kaeldaw/instruments/SampleCache");
  const sampleBlobs = SampleCache.toBlobs();
  const blob = await saveToBlob(schema, sampleBlobs);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${schema.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.kaeldaw`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadProjectFile(file: File): Promise<void> {
  const result = await loadFromBlob(file);
  project.fromSchema(result.schema);
  if (result.samples.size > 0) {
    const { SampleCache } = await import("@kaeldaw/instruments/SampleCache");
    SampleCache.fromBlobs(result.samples);
  }
}
