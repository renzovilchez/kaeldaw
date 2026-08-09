import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";
// @ts-expect-error - Vite provides WASM URL resolution
import wasmUrl from "kaeldaw-dsp/kaeldaw_dsp_bg.wasm?url";
// @ts-expect-error - Vite provides URL resolution for worklet
import workletUrl from "./worklet/processor.js?url";

let _moduleLoaded = false;

export class PolySynthOutputSingleton {
  private _worklet: AudioWorkletNode | null = null;
  private gain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private _rafId: number | null = null;
  private _onLevel: ((level: number) => void) | null = null;
  private _waveformBuf = new Float32Array(2048);
  private _waveformIdx = 0;
  private _pendingMetronome: {
    enabled: boolean;
    ppqn: number;
    beats: number;
  } | null = null;
  private _channelStates = new Map<
    string,
    {
      volume: number;
      pan: number;
      mute: boolean;
      insertDelay: boolean;
      insertReverb: boolean;
      sendLevel: number;
      delaySend: number;
    }
  >();

  set onLevel(cb: ((level: number) => void) | null) {
    this._onLevel = cb;
  }

  get synthInstance(): null {
    return null;
  }
  get isStarted(): boolean {
    return this._worklet !== null;
  }

  setChannelVolume(
    channelId: string,
    volume: number,
    pan: number,
    mute: boolean,
  ): void {
    const st = this._channelStates.get(channelId) || {
      volume: 0.8,
      pan: 0,
      mute: false,
      insertDelay: false,
      insertReverb: false,
      sendLevel: 0,
      delaySend: 0,
    };
    st.volume = volume;
    st.pan = pan;
    st.mute = mute;
    this._channelStates.set(channelId, st);
    this._worklet?.port.postMessage({
      type: "channelFx",
      channelId,
      volume,
      pan,
      mute,
    });
  }

  setChannelInsertFx(
    channelId: string,
    type: "delay" | "reverb",
    enabled: boolean,
    _wet: number,
  ): void {
    void _wet;
    const st = this._channelStates.get(channelId) || {
      volume: 0.8,
      pan: 0,
      mute: false,
      insertDelay: false,
      insertReverb: false,
      sendLevel: 0,
      delaySend: 0,
    };
    if (type === "delay") st.insertDelay = enabled;
    else st.insertReverb = enabled;
    this._channelStates.set(channelId, st);
    this._worklet?.port.postMessage({
      type: "channelFx",
      channelId,
      insertDelay: st.insertDelay,
      insertReverb: st.insertReverb,
    });
  }

  setChannelSendLevel(channelId: string, level: number): void {
    const st = this._channelStates.get(channelId) || {
      volume: 0.8,
      pan: 0,
      mute: false,
      insertDelay: false,
      insertReverb: false,
      sendLevel: 0,
      delaySend: 0,
    };
    st.sendLevel = level;
    this._channelStates.set(channelId, st);
    this._worklet?.port.postMessage({
      type: "channelFx",
      channelId,
      sendLevel: level,
    });
  }

  loadSample(sampleId: string, data: Float32Array, sampleRate: number): void {
    this._worklet?.port.postMessage(
      { type: "loadSample", data: data.buffer, sampleRate, _sid: sampleId },
      [data.buffer],
    );
  }

  setConfig(config: Record<string, unknown>): void {
    const c = { ...config };
    delete c.engine;
    this._worklet?.port.postMessage({ type: "cfg", config: c });
  }

  setMetronome(enabled: boolean, ppqn: number, beatsPerBar: number): void {
    this._pendingMetronome = { enabled, ppqn, beats: beatsPerBar };
    this._worklet?.port.postMessage({
      type: "metro",
      enabled,
      ppqn,
      beats: beatsPerBar,
    });
  }

  startScheduled(
    events: {
      tick: number;
      type: string;
      note: number;
      velocity: number;
      channelId: string;
    }[],
    bpm: number,
    ppqn: number,
    startTick: number,
  ): void {
    this._worklet?.port.postMessage({
      type: "events",
      events,
      bpm,
      ppqn,
      startTick,
    });
  }

  noteOn(
    note: number,
    velocity: number,
    channelId?: string,
    engine?: string,
  ): void {
    this._worklet?.port.postMessage({
      type: "noteOn",
      note,
      vel: velocity,
      channelId: channelId ?? "",
      engine: engine ?? "synth",
    });
  }
  noteOff(note: number): void {
    this._worklet?.port.postMessage({ type: "noteOff", note });
  }
  allNotesOff(): void {
    this._worklet?.port.postMessage({ type: "allOff" });
  }

  getWaveformSamples(): Float32Array | null {
    if (this._waveformIdx === 0) return null;
    return this._waveformBuf;
  }

  async start(): Promise<void> {
    this.stop();
    await AudioContextManager.resume();
    const ctx = AudioContextManager.getInstance();

    if (!_moduleLoaded) {
      await ctx.audioWorklet.addModule(workletUrl);
      _moduleLoaded = true;
    }

    this._worklet = new AudioWorkletNode(ctx, "kaeldaw-synth", {
      processorOptions: { sampleRate: ctx.sampleRate },
      outputChannelCount: [2],
    });

    this._worklet.port.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === "wf") {
        this._waveformBuf = new Float32Array(msg.buf);
        this._waveformIdx = this._waveformBuf.length;
      } else if (msg.type === "err") {
        console.error("Worklet error:", msg.message);
      }
    };

    if (this._pendingMetronome) {
      this._worklet.port.postMessage({
        type: "metro",
        ...this._pendingMetronome,
      });
    }

    this.gain = ctx.createGain();
    this.gain.gain.value = 0.8;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this._worklet.connect(this.gain);
    this.gain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    this._runLoop();

    // Load WASM bytes → send to worklet (the worklet compiles and instantiates)
    try {
      const response = await fetch(wasmUrl);
      const bytes = await response.arrayBuffer();
      this._worklet.port.postMessage({ type: "wasm", bytes }, [bytes]);
      await new Promise<void>((resolve) => {
        const port = this._worklet!.port;
        if (typeof port.addEventListener !== "function") {
          resolve();
          return;
        }
        const timer = setTimeout(resolve, 5000);
        const listener = (event: MessageEvent) => {
          if (event.data?.type === "wasm_ok" || event.data?.type === "err") {
            clearTimeout(timer);
            port.removeEventListener("message", listener);
            resolve();
          }
        };
        port.addEventListener("message", listener);
      });
    } catch (err) {
      console.warn("WASM load failed:", err);
    }
  }

  stop(): void {
    try {
      this._worklet?.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.gain?.disconnect();
    } catch {
      /* ok */
    }
    try {
      this.analyser?.disconnect();
    } catch {
      /* ok */
    }
    this._worklet = null;
    this.gain = null;
    this.analyser = null;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._level = 0;
    this._onLevel?.(0);
    this._waveformIdx = 0;
  }

  private _level = 0;
  private _runLoop(): void {
    if (!this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const loop = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      this._level = Math.min(1, Math.sqrt(sum / data.length) * 2.5);
      this._onLevel?.(this._level);
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }
}

export const PolySynthOutput = (() => {
  const key = Symbol.for("kaeldaw.PolySynthOutput");
  const g = globalThis as {
    [key: symbol]: PolySynthOutputSingleton | undefined;
  };
  if (g[key]) g[key].stop();
  return g[key] ?? (g[key] = new PolySynthOutputSingleton());
})();
