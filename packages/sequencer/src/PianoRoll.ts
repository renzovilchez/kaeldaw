import { setupCanvas, createDragHandlers, ticksToPx, pxToTicks, clamp } from "@kaeldaw/shared/canvas-utils";

const NOTE_HEIGHT = 12;
const KEY_WIDTH = 56;
const HEADER_HEIGHT = 24;
const MIN_PIXELS_PER_BEAT = 10;
const MAX_PIXELS_PER_BEAT = 200;
const DEFAULT_PPB = 40;
const MIDI_NOTE_MAX = 127;
const MIDI_NOTE_ABSOLUTE_MIN = 12; // C0 — hard floor
const DEFAULT_VELOCITY = 100;

const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export type MidiNoteData = {
  id: number;
  note: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
  color?: string;
};

export class PianoRoll extends HTMLElement {
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _notes: MidiNoteData[] = [];
  private _nextNoteId = 1;
  private _playheadTick = 0;
  private _pixelsPerBeat = DEFAULT_PPB;
  private _scrollX = 0;
  private _scrollY = 0;
  private _noteStart = 96;
  private _noteEnd = 48;
  private _totalDurationTicks = 3840;
  private _selectedNoteId: number | null = null;
  private _snapUnit: number = 6;

  private _dragState: {
    type: "move" | "resize" | "create" | null;
    noteId: number;
    startMouseX: number;
    startMouseY: number;
    origNote: number;
    origStartTick: number;
    origDurationTicks: number;
  } | null = null;

  private _rafId: number | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _drag: ReturnType<typeof createDragHandlers> | null = null;
  private _onWheel: (e: WheelEvent) => void;
  private _onKeyDown: (e: KeyboardEvent) => void;

  constructor() {
    super();
    this._onWheel = this._handleWheel.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
  }

  connectedCallback() {
    const { canvas, ctx } = setupCanvas(this);
    this._canvas = canvas;
    this._ctx = ctx;
    this.update();
    this.addEventListener("wheel", this._onWheel, { passive: false });
    this.addEventListener("keydown", this._onKeyDown);
    this.tabIndex = 0;
    this._resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.update()) : null;
    this._resizeObserver?.observe(this);
    this._setupDrag();
    this._startRaf();
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    this._drag?.detach(this);
    this.removeEventListener("wheel", this._onWheel);
    this.removeEventListener("keydown", this._onKeyDown);
    this._stopRaf();
  }

  private _setupDrag() {
    this._drag = createDragHandlers(
      (e: MouseEvent) => this._onDragStart(e),
      (e: MouseEvent, dx: number, dy: number) => this._onDragMove(e, dx, dy),
      () => this._onDragEnd(),
    );
    this._drag?.attach(this);
  }

  private _updateSize() {
    if (!this._canvas) return;
    const rect = this.getBoundingClientRect();
    this._canvas.width = rect.width || 800;
    this._canvas.height = rect.height || 300;
  }

  update() {
    this._updateSize();
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

  get playheadTick(): number { return this._playheadTick; }
  set playheadTick(t: number) { this._playheadTick = Math.max(0, t); }

  get pixelsPerBeat(): number { return this._pixelsPerBeat; }
  set pixelsPerBeat(v: number) {
    this._pixelsPerBeat = clamp(v, MIN_PIXELS_PER_BEAT, MAX_PIXELS_PER_BEAT);
  }

  get scrollX(): number { return this._scrollX; }
  set scrollX(v: number) { this._scrollX = Math.max(0, v); }

  get scrollY(): number { return this._scrollY; }
  set scrollY(v: number) {
    const maxScroll = this._maxScrollY();
    this._scrollY = v < 0 ? 0 : v > maxScroll ? maxScroll : v;
  }

  get noteStart(): number { return this._noteStart; }
  set noteStart(v: number) {
    this._noteStart = clamp(v, this._noteEnd + 1, MIDI_NOTE_MAX);
  }

  get noteEnd(): number { return this._noteEnd; }
  set noteEnd(v: number) {
    this._noteEnd = clamp(Math.floor(v / 12) * 12, MIDI_NOTE_ABSOLUTE_MIN, this._noteStart - 1);
  }

  get totalDurationTicks(): number { return this._totalDurationTicks; }
  set totalDurationTicks(v: number) { this._totalDurationTicks = Math.max(1, v); }

  get selectedNoteId(): number | null { return this._selectedNoteId; }
  set selectedNoteId(v: number | null) { this._selectedNoteId = v; }

  get snapUnit(): string {
    const map: Record<number, string> = { 24: "bar", 6: "1/4", 3: "1/8", 1: "1/16" };
    return map[this._snapUnit] || "1/4";
  }
  set snapUnit(v: string) {
    const map: Record<string, number> = { bar: 24, "1/4": 6, "1/8": 3, "1/16": 1 };
    this._snapUnit = map[v] || 6;
  }

  get pixelsPerTick(): number { return this._pixelsPerBeat / 24; }

  get NOTE_HEIGHT(): number { return NOTE_HEIGHT; }

  zoomIn(): void { this.pixelsPerBeat = this._pixelsPerBeat * 1.3; }
  zoomOut(): void { this.pixelsPerBeat = this._pixelsPerBeat / 1.3; }
  scrollToTick(tick: number): void { this.scrollX = tick; }
  scrollToNote(note: number): void {
    const mid = (this._noteStart + this._noteEnd) / 2;
    this.scrollY = (mid - note) * 12;
  }

  addNote(note: number, startTick: number, durationTicks: number, velocity = DEFAULT_VELOCITY, color?: string, externalId?: number): number {
    const id = externalId ?? this._nextNoteId++;
    if (externalId !== undefined) this._nextNoteId = Math.max(this._nextNoteId, externalId + 1);
    this._notes.push({ id, note, startTick, durationTicks, velocity: clamp(velocity, 0, 127), color: color || "#22d3ee" });
    return id;
  }

  removeNote(noteId: number): void {
    this._notes = this._notes.filter((n) => n.id !== noteId);
    if (this._selectedNoteId === noteId) this._selectedNoteId = null;
  }

  getNotes(): MidiNoteData[] { return [...this._notes]; }
  clearNotes(): void { this._notes = []; this._selectedNoteId = null; }

  // --- Drawing ---

  draw() {
    const ctx = this._ctx;
    const canvas = this._canvas;
    if (!ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    const ppb = this._pixelsPerBeat;
    const gridLeft = KEY_WIDTH;
    const gridW = w - gridLeft;

    // --- Grid area ---
    const visibleStart = this._scrollX;
    const visibleEnd = this._scrollX + gridW;

    // Beat lines
    ctx.strokeStyle = "#2a2a4e";
    ctx.lineWidth = 1;
    const firstBeat = Math.max(0, Math.floor(visibleStart / ppb));
    const lastBeat = Math.ceil(visibleEnd / ppb);
    for (let beat = firstBeat; beat <= lastBeat; beat++) {
      const x = ticksToPx(beat * 24, this.pixelsPerTick) - this._scrollX + gridLeft;
      ctx.beginPath();
      ctx.moveTo(x, HEADER_HEIGHT);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Note lines (horizontal)
    ctx.strokeStyle = "#1f1f3a";
    ctx.lineWidth = 1;
    for (let note = this._noteEnd; note <= this._noteStart; note++) {
      const y = this._noteY(note) + NOTE_HEIGHT / 2;
      ctx.beginPath();
      ctx.moveTo(gridLeft, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // --- Piano keys ---
    for (let note = this._noteEnd; note <= this._noteStart; note++) {
      const y = this._noteY(note);
      const isBlack = BLACK_KEYS.has(note % 12);
      const noteName = NOTE_NAMES[note % 12];
      const octave = Math.floor(note / 12) - 1;

      ctx.fillStyle = isBlack ? "#222" : "#e0e0e0";
      ctx.fillRect(0, y, KEY_WIDTH, NOTE_HEIGHT);

      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0, y, KEY_WIDTH, NOTE_HEIGHT);

      if (!isBlack) {
        ctx.fillStyle = "#666";
        ctx.font = "7px sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${noteName}${octave}`, KEY_WIDTH - 2, y + NOTE_HEIGHT / 2);
      }
    }

    // --- Notes ---
    for (const n of this._notes) {
      const nx = ticksToPx(n.startTick, this.pixelsPerTick) - this._scrollX + gridLeft;
      const nw = ticksToPx(n.durationTicks, this.pixelsPerTick);
      const ny = this._noteY(n.note) + 1;
      const nh = NOTE_HEIGHT - 2;

      if (nx + nw < gridLeft || nx > w) continue;
      if (ny + nh < HEADER_HEIGHT || ny > h) continue;

      const isSelected = n.id === this._selectedNoteId;
      const color = n.color || "#22d3ee";
      ctx.fillStyle = color + "88";
      ctx.beginPath();
      ctx.roundRect(nx, ny, nw, nh, 3);
      ctx.fill();

      ctx.strokeStyle = isSelected ? "#fff" : color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(nx, ny, nw, nh, 3);
      ctx.stroke();

      // Resize handle
      if (nw > 12) {
        ctx.fillStyle = color + "66";
        ctx.fillRect(nx + nw - 4, ny, 4, nh);
      }
    }

    // --- Header ruler ---
    ctx.fillStyle = "#16213e";
    ctx.fillRect(0, 0, w, HEADER_HEIGHT);

    ctx.fillStyle = "#e5e7eb";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const firstBar = Math.max(0, Math.floor(visibleStart / (ppb * 4)));
    const lastBar = Math.ceil(visibleEnd / (ppb * 4));
    for (let bar = firstBar; bar <= lastBar; bar++) {
      const x = ticksToPx(bar * 96, this.pixelsPerTick) - this._scrollX + gridLeft;
      ctx.fillText(`${bar + 1}`, x, HEADER_HEIGHT / 2);
    }

    // --- Playhead ---
    const phX = ticksToPx(this._playheadTick, this.pixelsPerTick) - this._scrollX + gridLeft;
    if (phX >= gridLeft && phX <= w) {
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(phX, HEADER_HEIGHT);
      ctx.lineTo(phX, h);
      ctx.stroke();
    }
  }

  private _noteY(note: number): number {
    return HEADER_HEIGHT + (this._noteStart - note) * NOTE_HEIGHT - this._scrollY;
  }

  private _maxScrollY(): number {
    const totalNotes = this._noteStart - this._noteEnd;
    const notesPx = totalNotes * NOTE_HEIGHT;
    const visiblePx = (this._canvas?.height || 300) - HEADER_HEIGHT;
    return Math.max(0, notesPx - visiblePx);
  }

  private _noteFromY(clientY: number): number {
    const rect = this._canvas!.getBoundingClientRect();
    const canvasY = clientY - rect.top + this._scrollY - HEADER_HEIGHT;
    const idx = Math.floor(canvasY / NOTE_HEIGHT);
    return clamp(this._noteStart - idx, this._noteEnd, this._noteStart);
  }

  private _tickFromX(clientX: number): number {
    const rect = this._canvas!.getBoundingClientRect();
    const canvasX = clientX - rect.left + this._scrollX - KEY_WIDTH;
    return pxToTicks(canvasX, this.pixelsPerTick);
  }

  private _snapTick(tick: number): number {
    return Math.round(tick / this._snapUnit) * this._snapUnit;
  }

  private _findNoteAt(clientX: number, clientY: number): MidiNoteData | null {
    const tick = this._tickFromX(clientX);
    const note = this._noteFromY(clientY);
    for (let i = this._notes.length - 1; i >= 0; i--) {
      const n = this._notes[i];
      if (n.note !== note) continue;
      if (tick >= n.startTick && tick <= n.startTick + n.durationTicks) {
        return n;
      }
    }
    return null;
  }

  private _isOnResizeHandle(clientX: number, note: MidiNoteData): boolean {
    const rect = this._canvas!.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const noteEndX = ticksToPx(note.startTick + note.durationTicks, this.pixelsPerTick) - this._scrollX + KEY_WIDTH;
    return Math.abs(canvasX - noteEndX) <= 4;
  }

  private _onDragStart(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target !== this._canvas) return;
    const canvasX = e.clientX - this._canvas!.getBoundingClientRect().left;
    if (canvasX < KEY_WIDTH) return;

    const existing = this._findNoteAt(e.clientX, e.clientY);
    if (existing) {
      this._selectedNoteId = existing.id;
      const isResize = this._isOnResizeHandle(e.clientX, existing);
      this._dragState = {
        type: isResize ? "resize" : "move",
        noteId: existing.id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        origNote: existing.note,
        origStartTick: existing.startTick,
        origDurationTicks: existing.durationTicks,
      };
    } else {
      // Create new note on click
      const tick = this._snapTick(Math.max(0, Math.round(this._tickFromX(e.clientX))));
      const note = this._noteFromY(e.clientY);
      if (tick >= 0) {
        const id = this.addNote(note, tick, this._snapUnit * 4);
        this._selectedNoteId = id;
        this._dragState = {
          type: "move",
          noteId: id,
          startMouseX: e.clientX,
          startMouseY: e.clientY,
          origNote: note,
          origStartTick: tick,
          origDurationTicks: this._snapUnit * 4,
        };
        this.dispatchEvent(new CustomEvent("note-add", {
          detail: { noteId: id, note, startTick: tick, durationTicks: this._snapUnit * 4 },
        }));
      }
    }
  }

  private _onDragMove(_e: MouseEvent, _dx: number, dy: number) {
    if (!this._dragState) return;
    const drag = this._dragState;
    const n = this._notes.find((x) => x.id === drag.noteId);
    if (!n) return;

    if (drag.type === "move") {
      const dxTick = this._tickFromX(_e.clientX) - this._tickFromX(drag.startMouseX);
      const noteDelta = -(dy / NOTE_HEIGHT);
      n.startTick = Math.max(0, this._snapTick(drag.origStartTick + dxTick));
      n.note = clamp(drag.origNote + Math.round(noteDelta), this._noteEnd, this._noteStart);
    } else if (drag.type === "resize") {
      const dxTick = this._tickFromX(_e.clientX) - this._tickFromX(drag.startMouseX);
      n.durationTicks = Math.max(this._snapUnit, this._snapTick(drag.origDurationTicks + dxTick));
    }
  }

  private _onDragEnd() {
    if (!this._dragState) return;
    const drag = this._dragState;
    const n = this._notes.find((x) => x.id === drag.noteId);
    if (!n) { this._dragState = null; return; }

    if (drag.type === "move") {
      this.dispatchEvent(new CustomEvent("note-move", {
        detail: { noteId: n.id, note: n.note, startTick: n.startTick },
      }));
    } else if (drag.type === "resize") {
      this.dispatchEvent(new CustomEvent("note-resize", {
        detail: { noteId: n.id, startTick: n.startTick, durationTicks: n.durationTicks },
      }));
    }
    this._dragState = null;
  }

  private _handleWheel(e: WheelEvent) {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) this.zoomIn();
      else this.zoomOut();
    } else {
      this._scrollY = clamp(this._scrollY + e.deltaY, 0, this._maxScrollY());
    }
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Delete" || e.key === "Backspace") {
      if (this._selectedNoteId !== null) {
        const id = this._selectedNoteId;
        this.removeNote(id);
        this.dispatchEvent(new CustomEvent("note-delete", { detail: { noteId: id } }));
        e.preventDefault();
      }
    }
  }
}

if (!customElements.get("daw-piano-roll")) {
  customElements.define("daw-piano-roll", PianoRoll);
}
