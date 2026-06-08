import { describe, it, expect } from "vitest";
import { encodeWav, createDownloadLink, revokeDownloadLink, exportWav } from "../wav-export";

function readWavHeader(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  return {
    riff: String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)),
    fileSize: view.getUint32(4, true),
    wave: String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)),
    audioFormat: view.getUint16(20, true),
    numChannels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true),
    blockAlign: view.getUint16(32, true),
    bitsPerSample: view.getUint16(34, true),
    dataSize: view.getUint32(40, true),
  };
}

function readPcm16(buffer: ArrayBuffer, offset = 44): Int16Array {
  return new Int16Array(buffer, offset);
}

describe("encodeWav", () => {
  it("genera header RIFF/WAVE correcto", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const buf = encodeWav(samples, 44100, 16);
    const h = readWavHeader(buf);
    expect(h.riff).toBe("RIFF");
    expect(h.wave).toBe("WAVE");
    expect(h.audioFormat).toBe(1);
  });

  it("16bit convierte float32 a int16 sin overflow", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 0.3]);
    const buf = encodeWav(samples, 44100, 16);
    const pcm = readPcm16(buf);
    expect(pcm[0]).toBe(0);
    expect(pcm[1]).toBe(16384);
    expect(pcm[2]).toBe(-16384);
    expect(pcm[3]).toBe(32767);
    expect(pcm[4]).toBe(-32768);
  });

  it("16bit produce tamaño correcto (44 + samples*2)", () => {
    const samples = new Float32Array(100);
    const buf = encodeWav(samples, 44100, 16);
    expect(buf.byteLength).toBe(44 + 100 * 2);
    const h = readWavHeader(buf);
    expect(h.dataSize).toBe(100 * 2);
    expect(h.bitsPerSample).toBe(16);
  });

  it("32bit copia floats directamente", () => {
    const samples = new Float32Array([0, 0.5, -0.5]);
    const buf = encodeWav(samples, 48000, 32);
    expect(buf.byteLength).toBe(44 + 3 * 4);
    const h = readWavHeader(buf);
    expect(h.bitsPerSample).toBe(32);
    expect(h.byteRate).toBe(48000 * 4);
    const floats = new Float32Array(buf, 44);
    expect(floats[0]).toBeCloseTo(0);
    expect(floats[1]).toBeCloseTo(0.5);
    expect(floats[2]).toBeCloseTo(-0.5);
  });

  it("header fields son correctos para 44100/16/mono", () => {
    const samples = new Float32Array(1000);
    const buf = encodeWav(samples, 44100, 16);
    const h = readWavHeader(buf);
    expect(h.sampleRate).toBe(44100);
    expect(h.numChannels).toBe(1);
    expect(h.blockAlign).toBe(2);
    expect(h.byteRate).toBe(44100 * 2);
    expect(h.fileSize).toBe(buf.byteLength - 8);
  });

  it("con array vacio retorna solo header", () => {
    const samples = new Float32Array(0);
    const buf = encodeWav(samples, 44100, 16);
    expect(buf.byteLength).toBe(44);
    const h = readWavHeader(buf);
    expect(h.dataSize).toBe(0);
  });

  it("clampa valores fuera de [-1, 1]", () => {
    const samples = new Float32Array([1.5, -2, 0]);
    const buf = encodeWav(samples, 44100, 16);
    const pcm = readPcm16(buf);
    expect(pcm[0]).toBe(32767);
    expect(pcm[1]).toBe(-32768);
    expect(pcm[2]).toBe(0);
  });
});

describe("createDownloadLink", () => {
  it("crea un anchor element", () => {
    const blob = new Blob(["test"], { type: "audio/wav" });
    const a = createDownloadLink(blob, "test.wav");
    expect(a.tagName).toBe("A");
    expect(a.download).toBe("test.wav");
    expect(a.href).toBeTruthy();
    expect(document.body.contains(a)).toBe(true);
    revokeDownloadLink(a);
  });

  it("revokeDownloadLink remueve el elemento", () => {
    const blob = new Blob(["test"], { type: "audio/wav" });
    const a = createDownloadLink(blob, "test.wav");
    expect(document.body.contains(a)).toBe(true);
    revokeDownloadLink(a);
    expect(document.body.contains(a)).toBe(false);
  });
});

describe("exportWav", () => {
  it("retorna ExportResult con blob", async () => {
    const result = await exportWav({ sampleRate: 44100, masterMix: true });
    expect(result.master).not.toBeNull();
    expect(result.master!.type).toBe("audio/wav");
    expect(result.duration).toBeGreaterThan(0);
    expect(result.sampleRate).toBe(44100);
  });

  it("acepta sampleRate personalizado", async () => {
    const result = await exportWav({ sampleRate: 48000 });
    expect(result.sampleRate).toBe(48000);
  });

  it("acepta opcion tracks", async () => {
    const result = await exportWav({ tracks: ["track-1", "track-2"] });
    expect(result.tracks.size).toBe(2);
  });
});
