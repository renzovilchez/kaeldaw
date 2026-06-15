import { setupCanvas } from "@kaeldaw/shared/canvas-utils";

export class DawWaveform extends HTMLElement {
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _samples: Float32Array | null = null;
  private _playheadPosition = 0;
  private _zoom = 1;
  private _scrollPosition = 0;
  private _waveColor = "#22d3ee";
  private _backgroundColor = "#1a1a2e";
  private _showPlayhead = true;
  private _height = 64;
  private _resizeObserver: ResizeObserver | null = null;
  private _onClick: (e: MouseEvent) => void;

  constructor() {
    super();
    this._onClick = this._handleClick.bind(this);
  }

  connectedCallback() {
    const { canvas, ctx } = setupCanvas(this);
    this._canvas = canvas;
    this._ctx = ctx;
    this.update();
    this._resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.update()) : null;
    this._resizeObserver?.observe(this);
    this.addEventListener("click", this._onClick);
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    this.removeEventListener("click", this._onClick);
  }

  // --- Properties ---

  get samples(): Float32Array | null { return this._samples; }
  set samples(arr: Float32Array | null) {
    this._samples = arr;
    this.draw();
  }

  get playheadPosition(): number { return this._playheadPosition; }
  set playheadPosition(v: number) {
    this._playheadPosition = Math.max(0, Math.min(1, v));
    this.draw();
  }

  get zoom(): number { return this._zoom; }
  set zoom(v: number) {
    this._zoom = Math.max(0.1, Math.min(100, v));
    this.draw();
  }

  get scrollPosition(): number { return this._scrollPosition; }
  set scrollPosition(v: number) {
    this._scrollPosition = Math.max(0, Math.min(1, v));
    this.draw();
  }

  get waveColor(): string { return this._waveColor; }
  set waveColor(v: string) { this._waveColor = v; this.draw(); }

  get backgroundColor(): string { return this._backgroundColor; }
  set backgroundColor(v: string) { this._backgroundColor = v; this.draw(); }

  get showPlayhead(): boolean { return this._showPlayhead; }
  set showPlayhead(v: boolean) { this._showPlayhead = v; this.draw(); }

  get height(): number { return this._height; }
  set height(v: number) {
    this._height = Math.max(8, v);
    this.update();
  }

  // --- Public methods ---

  loadFromBuffer(buffer: AudioBuffer): void {
    if (buffer.numberOfChannels > 0) {
      this._samples = buffer.getChannelData(0);
      this.draw();
    }
  }

  loadFromArray(arr: Float32Array): void {
    this._samples = arr;
    this.draw();
  }

  clear(): void {
    this._samples = null;
    this.draw();
  }

  update() {
    if (!this._canvas) return;
    this._canvas.width = this.clientWidth || 300;
    this._canvas.height = this.clientHeight || this._height;
    this.draw();
  }

  // --- Drawing ---

  draw() {
    const ctx = this._ctx;
    const canvas = this._canvas;
    if (!ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = this._backgroundColor;
    ctx.fillRect(0, 0, w, h);

    if (!this._samples || this._samples.length === 0) {
      ctx.fillStyle = "#555";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No audio clip selected", w / 2, h / 2);
      return;
    }

    const samples = this._samples;
    const totalSamples = samples.length;
    const visibleSamples = Math.max(1, totalSamples / this._zoom);
    const startSample = Math.floor(this._scrollPosition * (totalSamples - visibleSamples));
    const endSample = Math.min(totalSamples, startSample + visibleSamples);
    const visibleRange = endSample - startSample;

    if (visibleRange <= 0) return;

    const pixelsPerSample = w / visibleRange;
    const center = h / 2;
    const halfHeight = h / 2;

    ctx.fillStyle = this._waveColor + "44";

    for (let px = 0; px < w; px++) {
      const sampleStart = startSample + Math.floor(px / pixelsPerSample);
      const sampleEnd = startSample + Math.floor((px + 1) / pixelsPerSample);
      const s = Math.max(0, Math.min(sampleStart, totalSamples - 1));
      const e = Math.max(s, Math.min(sampleEnd, totalSamples));

      let min = 0;
      let max = 0;
      for (let i = s; i < e; i++) {
        const v = samples[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }

      const yTop = center - Math.abs(max) * halfHeight;
      const yBot = center + Math.abs(min) * halfHeight;

      if (yBot - yTop > 0.5) {
        ctx.fillRect(px, yTop, 1, Math.max(1, yBot - yTop));
      }
    }

    // Center line
    ctx.strokeStyle = this._waveColor + "22";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, center);
    ctx.lineTo(w, center);
    ctx.stroke();

    // Playhead
    if (this._showPlayhead && this._playheadPosition >= 0 && this._playheadPosition <= 1) {
      const phX = this._playheadPosition * w;
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(phX, 0);
      ctx.lineTo(phX, h);
      ctx.stroke();
    }
  }

  // --- Handlers ---

  private _handleClick(e: MouseEvent) {
    const rect = this._canvas!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = Math.max(0, Math.min(1, x / rect.width));
    this.dispatchEvent(new CustomEvent("waveform-click", { detail: { position } }));
  }
}

if (!customElements.get("daw-waveform")) {
  customElements.define("daw-waveform", DawWaveform);
}
