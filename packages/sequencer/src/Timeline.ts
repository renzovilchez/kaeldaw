import { setupCanvas, ticksToPx, pxToTicks } from "@kaeldaw/shared/canvas-utils";

const TRACK_HEIGHT = 64;
const HEADER_HEIGHT = 24;
const MIN_PIXELS_PER_BEAT = 10;
const MAX_PIXELS_PER_BEAT = 200;
const DEFAULT_PPB = 40;
const SNAP_BEAT = 1;

export type ClipData = {
  id: number;
  trackIndex: number;
  startTick: number;
  durationTicks: number;
  color: string;
  name: string;
};

export class Timeline extends HTMLElement {
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _clips: ClipData[] = [];
  private _nextClipId = 1;
  private _playheadTick = 0;
  private _pixelsPerBeat = DEFAULT_PPB;
  private _scrollX = 0;
  private _scrollY = 0;
  private _numTracks = 8;
  private _totalDurationTicks = 3840;

  private _dragState: {
    type: "move" | "resize" | null;
    clipId: number;
    startMouseX: number;
    startMouseY: number;
    origStartTick: number;
    origDurationTicks: number;
    origTrackIndex: number;
  } | null = null;

  private _selectedClipId: number | null = null;
  private _rafId: number | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;
  private _onWheel: (e: WheelEvent) => void;
  private _onKeyDown: (e: KeyboardEvent) => void;
  private _onDblClick: (e: MouseEvent) => void;

  constructor() {
    super();
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onDblClick = this._handleDblClick.bind(this);
  }

  connectedCallback() {
    this.render();
    this.addEventListener("mousedown", this._onMouseDown);
    this.addEventListener("wheel", this._onWheel, { passive: false });
    this.addEventListener("keydown", this._onKeyDown);
    this.addEventListener("dblclick", this._onDblClick);
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("mouseup", this._onMouseUp);
    this.tabIndex = 0;
    this._resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.update()) : null;
    this._resizeObserver?.observe(this);
    this._startRaf();
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    this.removeEventListener("mousedown", this._onMouseDown);
    this.removeEventListener("wheel", this._onWheel);
    this.removeEventListener("keydown", this._onKeyDown);
    this.removeEventListener("dblclick", this._onDblClick);
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("mouseup", this._onMouseUp);
    this._stopRaf();
  }

  private render() {
    const { canvas, ctx } = setupCanvas(this);
    this._canvas = canvas;
    this._ctx = ctx;
    this.update();
  }

  update() {
    if (!this._canvas) return;
    const rect = this.getBoundingClientRect();
    this._canvas.width = rect.width || 800;
    this._canvas.height = rect.height || 400;
    this.draw();
  }

  private _startRaf() {
    const loop = () => {
      this.draw();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  private _stopRaf() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  // --- Public API ---

  get playheadTick(): number {
    return this._playheadTick;
  }

  set playheadTick(tick: number) {
    this._playheadTick = Math.max(0, tick);
  }

  get pixelsPerBeat(): number {
    return this._pixelsPerBeat;
  }

  set pixelsPerBeat(ppb: number) {
    this._pixelsPerBeat = Math.max(MIN_PIXELS_PER_BEAT, Math.min(MAX_PIXELS_PER_BEAT, ppb));
  }

  get scrollX(): number {
    return this._scrollX;
  }

  set scrollX(px: number) {
    this._scrollX = Math.max(0, px);
  }

  get scrollY(): number {
    return this._scrollY;
  }

  set scrollY(px: number) {
    this._scrollY = Math.max(0, px);
  }

  get numTracks(): number {
    return this._numTracks;
  }

  set numTracks(n: number) {
    this._numTracks = n;
  }

  get totalDurationTicks(): number {
    return this._totalDurationTicks;
  }

  set totalDurationTicks(ticks: number) {
    this._totalDurationTicks = Math.max(1, ticks);
  }

  get selectedClipId(): number | null {
    return this._selectedClipId;
  }

  set selectedClipId(id: number | null) {
    this._selectedClipId = id;
  }

  get pixelsPerTick(): number {
    return this._pixelsPerBeat / 24;
  }

  zoomIn(): void {
    this.pixelsPerBeat = this._pixelsPerBeat * 1.3;
  }

  zoomOut(): void {
    this.pixelsPerBeat = this._pixelsPerBeat / 1.3;
  }

  scrollToTick(position: number): void {
    this.scrollX = position;
  }

  addClip(trackIndex: number, startTick: number, durationTicks: number, color = "#22d3ee", name = ""): number {
    const id = this._nextClipId++;
    this._clips.push({ id, trackIndex, startTick, durationTicks, color, name: name || `Clip ${id}` });
    return id;
  }

  removeClip(clipId: number): void {
    this._clips = this._clips.filter((c) => c.id !== clipId);
    if (this._selectedClipId === clipId) {
      this._selectedClipId = null;
    }
  }

  getClips(): ClipData[] {
    return [...this._clips];
  }

  clearClips(): void {
    this._clips = [];
    this._selectedClipId = null;
  }

  // --- Drawing ---

  draw() {
    const ctx = this._ctx;
    const canvas = this._canvas;
    if (!ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    const ppb = this._pixelsPerBeat;
    const totalPixels = ticksToPx(this._totalDurationTicks, this.pixelsPerTick);
    const visibleStart = this._scrollX;
    const visibleEnd = this._scrollX + w;
    const yOffset = this._scrollY % TRACK_HEIGHT;
    const gridTop = HEADER_HEIGHT - yOffset;
    const gridH = h - HEADER_HEIGHT + TRACK_HEIGHT;

    // --- Grid lines first (pueden extenderse dentro del header) ---
    const firstBar = Math.max(0, Math.floor(visibleStart / (ppb * 4)));
    const lastBar = Math.ceil(visibleEnd / (ppb * 4));
    for (let bar = firstBar; bar <= lastBar; bar++) {
      const x = bar * ppb * 4 - this._scrollX;
      if (x < -ppb || x > w + ppb) continue;
      ctx.fillStyle = "#2a2a4e";
      ctx.fillRect(x, gridTop, 1, gridH);
    }

    ctx.fillStyle = "#1f1f3a";
    const firstBeat = Math.max(0, Math.floor(visibleStart / ppb));
    const lastBeat = Math.ceil(visibleEnd / ppb);
    for (let beat = firstBeat; beat <= lastBeat; beat++) {
      const x = beat * ppb - this._scrollX;
      if (beat % 4 !== 0) {
        ctx.fillRect(x, gridTop, 1, gridH);
      }
    }

    // --- Track backgrounds (zebra llena canvas, filas reales más brillantes) ---
    if (this._numTracks > 0) {
      const totalVisibleRows = Math.ceil((h - HEADER_HEIGHT + this._scrollY) / TRACK_HEIGHT);
      for (let t = 0; t < totalVisibleRows; t++) {
        const y = HEADER_HEIGHT + t * TRACK_HEIGHT - this._scrollY;
        if (y + TRACK_HEIGHT < HEADER_HEIGHT || y > h) continue;
        if (t < this._numTracks) {
          ctx.fillStyle = t % 2 === 0 ? "#1e1e38" : "#1a1a2e";
        } else {
          ctx.fillStyle = "#181830";
        }
        ctx.fillRect(0, y, w, TRACK_HEIGHT);
      }
    }

    // --- Header ruler (se pinta ENCIMA de las grid lines para cubrirlas) ---
    ctx.fillStyle = "#16213e";
    ctx.fillRect(0, 0, w, HEADER_HEIGHT);
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let bar = firstBar; bar <= lastBar; bar++) {
      const x = bar * ppb * 4 - this._scrollX;
      if (x < -ppb || x > w + ppb) continue;
      ctx.fillText(`${bar + 1}`, x, HEADER_HEIGHT / 2);
    }

    // --- Empty state hint ---
    if (this._numTracks === 0) {
      ctx.fillStyle = "#777";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Agregá un track para empezar", w / 2, h / 2 - 4);
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#666";
      ctx.fillText("Click +Add track en el panel Tracks", w / 2, h / 2 + 24);
    }

    // --- Playhead ---
    const phX = ticksToPx(this._playheadTick, this.pixelsPerTick) - this._scrollX;
    if (phX >= 0 && phX <= w) {
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(phX, HEADER_HEIGHT);
      ctx.lineTo(phX, h);
      ctx.stroke();
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.moveTo(phX - 5, HEADER_HEIGHT);
      ctx.lineTo(phX + 5, HEADER_HEIGHT);
      ctx.lineTo(phX, HEADER_HEIGHT + 7);
      ctx.closePath();
      ctx.fill();
    }

    // --- Clips ---
    for (const clip of this._clips) {
      const cX = ticksToPx(clip.startTick, this.pixelsPerTick) - this._scrollX;
      const cW = ticksToPx(clip.durationTicks, this.pixelsPerTick);
      const cY = HEADER_HEIGHT + clip.trackIndex * TRACK_HEIGHT - this._scrollY + 2;
      const cH = TRACK_HEIGHT - 4;

      if (cX + cW < 0 || cX > w) continue;
      if (cY + cH < HEADER_HEIGHT || cY > h) continue;

      const isSelected = clip.id === this._selectedClipId;
      ctx.fillStyle = clip.color + "33";
      ctx.beginPath();
      ctx.roundRect(cX, cY, cW, cH, 4);
      ctx.fill();

      ctx.strokeStyle = isSelected ? "#ffffff" : clip.color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(cX, cY, cW, cH, 4);
      ctx.stroke();

    ctx.fillStyle = "#ccc";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const label = clip.name.length > Math.floor(cW / 7) ? clip.name.slice(0, Math.floor(cW / 7) - 1) + "…" : clip.name;
      ctx.fillText(label, cX + 4, cY + cH / 2);

      if (cW > 16) {
        ctx.fillStyle = clip.color + "88";
        ctx.fillRect(cX + cW - 5, cY, 5, cH);
      }
    }

    ctx.fillStyle = "#0f3460";
    ctx.fillRect(0, h - 4, w * Math.min(1, w / totalPixels), 2);
  }

  // --- Mouse handling ---

  private _tickFromX(clientX: number): number {
    const rect = this._canvas!.getBoundingClientRect();
    const canvasX = clientX - rect.left + this._scrollX;
    return pxToTicks(canvasX, this.pixelsPerTick);
  }

  private _trackFromY(clientY: number): number {
    const rect = this._canvas!.getBoundingClientRect();
    const canvasY = clientY - rect.top + this._scrollY - HEADER_HEIGHT;
    return Math.floor(canvasY / TRACK_HEIGHT);
  }

  private _snapTick(tick: number): number {
    const snapTicks = SNAP_BEAT * 24;
    return Math.round(tick / snapTicks) * snapTicks;
  }

  private _findClipAt(clientX: number, clientY: number): ClipData | null {
    const tick = this._tickFromX(clientX);
    const track = this._trackFromY(clientY);
    if (track < 0 || track >= this._numTracks) return null;
    for (let i = this._clips.length - 1; i >= 0; i--) {
      const c = this._clips[i];
      if (c.trackIndex !== track) continue;
      if (tick >= c.startTick && tick <= c.startTick + c.durationTicks) {
        return c;
      }
    }
    return null;
  }

  private _isOnResizeHandle(clientX: number, clip: ClipData): boolean {
    const rect = this._canvas!.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const clipEndX = ticksToPx(clip.startTick + clip.durationTicks, this.pixelsPerTick) - this._scrollX;
    return Math.abs(canvasX - clipEndX) <= 5;
  }

  private _handleMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target !== this._canvas) return;
    const clip = this._findClipAt(e.clientX, e.clientY);
    if (clip) {
      this.dispatchEvent(new CustomEvent("before-clip-action", {
        detail: JSON.parse(JSON.stringify({ clips: this._clips, nextId: this._nextClipId })),
      }));
      this._selectedClipId = clip.id;
      this.dispatchEvent(new CustomEvent("clip-select", { detail: { clipId: clip.id } }));
      const isResize = this._isOnResizeHandle(e.clientX, clip);
      this._dragState = {
        type: isResize ? "resize" : "move",
        clipId: clip.id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        origStartTick: clip.startTick,
        origDurationTicks: clip.durationTicks,
        origTrackIndex: clip.trackIndex,
      };
      e.preventDefault();
    } else {
      this._selectedClipId = null;
      const tick = Math.round(this._tickFromX(e.clientX));
      const track = this._trackFromY(e.clientY);
      if (track < this._numTracks) {
        this.dispatchEvent(new CustomEvent("timeline-click", { detail: { tick, trackIndex: track } }));
      }
    }
  }

  private _handleMouseMove(e: MouseEvent) {
    if (!this._dragState) {
      const clip = this._findClipAt(e.clientX, e.clientY);
      if (clip && this._isOnResizeHandle(e.clientX, clip)) {
        this._canvas!.style.cursor = "ew-resize";
      } else if (clip) {
        this._canvas!.style.cursor = "grab";
      } else {
        this._canvas!.style.cursor = "default";
      }
      return;
    }

    const drag = this._dragState;
    if (drag.type === "move") {
      const dxTick = this._tickFromX(e.clientX) - this._tickFromX(drag.startMouseX);
      const dyTrack = this._trackFromY(e.clientY) - this._trackFromY(drag.startMouseY);
      const clip = this._clips.find((c) => c.id === drag.clipId);
      if (clip) {
        const rawTick = drag.origStartTick + dxTick;
        clip.startTick = Math.max(0, this._snapTick(rawTick));
        clip.trackIndex = Math.max(0, Math.min(this._numTracks - 1, drag.origTrackIndex + dyTrack));
      }
    } else if (drag.type === "resize") {
      const dxTick = this._tickFromX(e.clientX) - this._tickFromX(drag.startMouseX);
      const clip = this._clips.find((c) => c.id === drag.clipId);
      if (clip) {
        const rawDuration = drag.origDurationTicks + dxTick;
        clip.durationTicks = Math.max(24, this._snapTick(rawDuration));
      }
    }
  }

  private _handleMouseUp() {
    if (this._dragState) {
      const clip = this._clips.find((c) => c.id === this._dragState!.clipId);
      if (clip) {
        if (this._dragState.type === "move") {
          this.dispatchEvent(new CustomEvent("clip-move", {
            detail: { clipId: clip.id, startTick: clip.startTick, trackIndex: clip.trackIndex },
          }));
        } else if (this._dragState.type === "resize") {
          this.dispatchEvent(new CustomEvent("clip-resize", {
            detail: { clipId: clip.id, startTick: clip.startTick, durationTicks: clip.durationTicks },
          }));
        }
      }
      this._dragState = null;
    }
  }

  private _handleWheel(e: WheelEvent) {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    } else {
      this._scrollX = Math.max(0, this._scrollX + e.deltaX);
      this._scrollY = Math.max(0, this._scrollY + e.deltaY);
    }
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Delete" || e.key === "Backspace") {
      if (this._selectedClipId !== null) {
        this.dispatchEvent(new CustomEvent("before-clip-action", {
          detail: JSON.parse(JSON.stringify({ clips: this._clips, nextId: this._nextClipId })),
        }));
        const id = this._selectedClipId;
        this.removeClip(id);
        this.dispatchEvent(new CustomEvent("clip-delete", { detail: { clipId: id } }));
        e.preventDefault();
      }
    }
  }

  private _handleDblClick(e: MouseEvent) {
    const clip = this._findClipAt(e.clientX, e.clientY);
    if (clip) {
      this.dispatchEvent(new CustomEvent("clip-dblclick", { detail: { clipId: clip.id } }));
    }
  }
}

if (!customElements.get("daw-timeline")) {
  customElements.define("daw-timeline", Timeline);
}
