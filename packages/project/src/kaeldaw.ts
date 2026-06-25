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

export async function saveToBlob(project: ProjectSchema, sampleBlobs?: Map<string, Blob>): Promise<Blob> {
  const json = serialize(project);
  const files: Record<string, Uint8Array> = { "project.json": strToU8(json) };

  if (sampleBlobs) {
    for (const [key, blob] of sampleBlobs) {
      const ab = await blob.arrayBuffer();
      files[key] = new Uint8Array(ab);
    }
  }

  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped], { type: KAELDAW_MIME });
}

export interface LoadResult {
  schema: ProjectSchema;
  samples: Map<string, Uint8Array>;
}

export async function loadFromBlob(blob: Blob): Promise<LoadResult> {
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
  const schema = deserialize(json);

  const samples = new Map<string, Uint8Array>();
  for (const [name, u8] of Object.entries(files)) {
    if (name.startsWith("samples/") && name.endsWith(".wav")) {
      samples.set(name, u8);
    }
  }

  return { schema, samples };
}

export async function loadFromFile(file: File): Promise<LoadResult> {
  return loadFromBlob(file);
}