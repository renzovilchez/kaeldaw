let wasmReady = false;
let wasm: typeof import("kaeldaw-dsp") | null = null;

async function ensureWasm(): Promise<void> {
  if (wasmReady) return;
  const mod = await import("kaeldaw-dsp");
  await mod.default();
  wasm = mod;
  wasmReady = true;
}

export async function initWasmEffects(): Promise<void> {
  await ensureWasm();
}

export function createWasmDelay(sampleRate: number, maxDelaySec = 2): number {
  if (!wasm) throw new Error("WASM not initialized");
  return wasm.delay_init(sampleRate, maxDelaySec);
}

export function setWasmDelay(handle: number, timeSec: number, feedback: number, mix: number): void {
  wasm?.delay_set(handle, timeSec, feedback, mix);
}

export function processWasmDelay(handle: number, input: number): number {
  if (!wasm) return input;
  return wasm.delay_process(handle, input);
}

export function freeWasmDelay(handle: number): void {
  wasm?.delay_free(handle);
}

export function createWasmReverb(sampleRate: number): number {
  if (!wasm) throw new Error("WASM not initialized");
  return wasm.reverb_init(sampleRate);
}

export function setWasmReverb(handle: number, decay: number, mix: number, damping: number): void {
  wasm?.reverb_set(handle, decay, mix, damping);
}

export function processWasmReverb(handle: number, input: number): number {
  if (!wasm) return input;
  return wasm.reverb_process(handle, input);
}

export function freeWasmReverb(handle: number): void {
  wasm?.reverb_free(handle);
}

export function createWasmLadder(sampleRate: number): number {
  if (!wasm) throw new Error("WASM not initialized");
  return wasm.ladder_init(sampleRate);
}

export function setWasmLadder(_handle: number, cutoff: number, resonance: number): number {
  if (!wasm) return 0;
  return wasm.ladder_set(cutoff, resonance);
}

export function processWasmLadder(handle: number, input: number): number {
  if (!wasm) return input;
  return wasm.ladder_process(handle, input);
}

export function freeWasmLadder(handle: number): void {
  wasm?.ladder_free(handle);
}
