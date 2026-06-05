import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { serialize, deserialize, type ProjectSchema } from "./schema";

export class KaeldawError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KaeldawError";
  }
}

const KAELDAW_MIME = "application/zip" as const;

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

export async function saveToBlob(project: ProjectSchema): Promise<Blob> {
  const json = serialize(project);
  const zipped = zipSync({ "project.json": strToU8(json) }, { level: 6 });
  return new Blob([zipped], { type: KAELDAW_MIME });
}

export async function loadFromBlob(blob: Blob): Promise<ProjectSchema> {
  let data: Uint8Array;
  try {
    data = await blobToUint8Array(blob);
  } catch {
    throw new KaeldawError("Invalid .kaeldaw archive");
  }

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch {
    throw new KaeldawError("Invalid .kaeldaw archive");
  }

  const projectJson = files["project.json"];
  if (!projectJson) {
    throw new KaeldawError("Missing project.json in .kaeldaw archive");
  }

  const json = strFromU8(projectJson);
  return deserialize(json);
}

export async function loadFromFile(file: File): Promise<ProjectSchema> {
  return loadFromBlob(file);
}
