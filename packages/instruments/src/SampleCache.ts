export interface SampleMeta {
  sampleRate: number;
  duration: number;
  channels: number;
}

class SampleCacheSingleton {
  private _samples = new Map<string, Float32Array>();
  private _meta = new Map<string, SampleMeta>();

  add(id: string, data: Float32Array, sampleRate: number, channels = 1): void {
    this._samples.set(id, data);
    this._meta.set(id, { sampleRate, duration: data.length / sampleRate, channels });
  }

  get(id: string): Float32Array | undefined {
    return this._samples.get(id);
  }

  getMeta(id: string): SampleMeta | undefined {
    return this._meta.get(id);
  }

  getAllIds(): string[] {
    return Array.from(this._samples.keys());
  }

  has(id: string): boolean {
    return this._samples.has(id);
  }

  remove(id: string): void {
    this._samples.delete(id);
    this._meta.delete(id);
  }

  clear(): void {
    this._samples.clear();
    this._meta.clear();
  }

  async loadFromFile(file: File): Promise<string> {
    const ab = await file.arrayBuffer();
    const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1, sampleRate: 44100 });
    const audioBuf = await ctx.decodeAudioData(ab);
    const id = crypto.randomUUID();
    const data = audioBuf.getChannelData(0);
    this.add(id, new Float32Array(data), audioBuf.sampleRate, audioBuf.numberOfChannels);
    return id;
  }

  toBlobs(): Map<string, Blob> {
    const blobs = new Map<string, Blob>();
    for (const [id, data] of this._samples) {
      const meta = this._meta.get(id);
      if (!meta) continue;
      const wav = encodeWav(data, meta.sampleRate, 16, meta.channels);
      blobs.set(`${id}.wav`, new Blob([wav], { type: "audio/wav" }));
    }
    return blobs;
  }

  fromBlobs(blobs: Map<string, Uint8Array>): void {
    for (const [name, u8] of blobs) {
      const id = name.replace(/\.wav$/, "");
      try {
        const ctx = new OfflineAudioContext({ numberOfChannels: 1, length: 1, sampleRate: 44100 });
        ctx.decodeAudioData(u8.buffer.slice(0) as ArrayBuffer).then((buf) => {
          this.add(id, new Float32Array(buf.getChannelData(0)), buf.sampleRate, buf.numberOfChannels);
        }).catch(() => {/* not in browser */});
      } catch { /* not in browser */ }
    }
  }

  generateSample(_name: string, durationSec: number, freq: number): string {
    const sr = 44100;
    const len = Math.round(sr * durationSec);
    const data = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 3);
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
    }
    const id = crypto.randomUUID();
    this.add(id, data, sr);
    return id;
  }
}

function encodeWav(samples: Float32Array, sampleRate: number, bitDepth: 16 | 24 | 32, numChannels: number): ArrayBuffer {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }
  writeString(0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 32768 : s * 32767;
    view.setInt16(44 + i * 2, Math.round(val), true);
  }
  return buffer;
}

export const SampleCache = (() => {
  const key = Symbol.for("kaeldaw.SampleCache");
  const g = globalThis as { [key: symbol]: SampleCacheSingleton | undefined };
  return g[key] ?? (g[key] = new SampleCacheSingleton());
})();