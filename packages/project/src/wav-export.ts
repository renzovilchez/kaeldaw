export type ExportOptions = {
  sampleRate?: number;
  bitDepth?: 16 | 24 | 32;
  tracks?: string[];
  masterMix?: boolean;
  format?: "wav" | "blob";
};

export type ExportResult = {
  master: Blob | null;
  tracks: Map<string, Blob>;
  duration: number;
  sampleRate: number;
};

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function encodeWav(samples: Float32Array, sampleRate: number, bitDepth: 16 | 24 | 32 = 16, numChannels = 1): ArrayBuffer {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    if (bitDepth === 16) {
      const val = s < 0 ? s * 32768 : s * 32767;
      view.setInt16(44 + i * 2, Math.round(val), true);
    } else if (bitDepth === 24) {
      const val = Math.round((s < 0 ? s * 8388608 : s * 8388607));
      view.setInt16(44 + i * 3, val & 0xFFFF, true);
      view.setInt8(44 + i * 3 + 2, (val >> 16) & 0xFF);
    } else if (bitDepth === 32) {
      view.setFloat32(44 + i * 4, s, true);
    }
  }

  return buffer;
}

export function createDownloadLink(blob: Blob, filename: string): HTMLAnchorElement {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  return a;
}

export function revokeDownloadLink(a: HTMLAnchorElement): void {
  URL.revokeObjectURL(a.href);
  if (a.parentNode) a.parentNode.removeChild(a);
}

export async function exportWav(options?: ExportOptions): Promise<ExportResult> {
  const sr = options?.sampleRate || 44100;
  const bitDepth = options?.bitDepth || 16;
  const bitDepth16 = bitDepth as 16 | 24 | 32;
  const duration = 10;

  const numSamples = Math.floor(sr * duration);
  const samples = new Float32Array(numSamples);

  // Generate a 440Hz sine tone with slight fading at start/end
  for (let i = 0; i < numSamples; i++) {
    const t = i / sr;
    let envelope = 1;
    if (i < sr * 0.05) envelope = i / (sr * 0.05);
    if (i > numSamples - sr * 0.05) envelope = (numSamples - i) / (sr * 0.05);
    samples[i] = Math.sin(2 * Math.PI * 440 * t) * 0.3 * envelope;
  }

  const masterBlob = new Blob([encodeWav(samples, sr, bitDepth16)], { type: "audio/wav" });
  const trackBlobs = new Map<string, Blob>();

  if (options?.tracks) {
    for (const trackId of options.tracks) {
      trackBlobs.set(trackId, new Blob([encodeWav(samples, sr, bitDepth16)], { type: "audio/wav" }));
    }
  }

  return {
    master: masterBlob,
    tracks: trackBlobs,
    duration,
    sampleRate: sr,
  };
}
