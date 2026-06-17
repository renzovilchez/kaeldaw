import { setupCanvas, setAriaSlider, snapStep, createDragHandlers } from "@kaeldaw/shared/canvas-utils";

const SA = 0.75 * Math.PI;
const EA = 2.25 * Math.PI;
const ARC_LEN = EA - SA;
const WRAPPED_END = EA - 2 * Math.PI;
const GAP_MID = (WRAPPED_END + SA) / 2;

export class DawKnob extends HTMLElement {
  private _value = 0;
  private _min = 0;
  private _max = 127;
  private _step = 1;
  private _size = 48;
  private _label = "";
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private _drag: ReturnType<typeof createDragHandlers> | null = null;
  private _dragStartValue = 0;
  private _dragStartAngle = 0;

  static get observedAttributes() {
    return ["value", "min", "max", "step", "size", "label"];
  }

  constructor() {
    super();
    this.addEventListener("keydown", this.onKeyDown);
  }

  connectedCallback() {
    this.render();
    this._drag?.attach(this);
  }

  disconnectedCallback() {
    this._drag?.detach(this);
    this.removeEventListener("keydown", this.onKeyDown);
  }

  attributeChangedCallback(_name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    switch (_name) {
      case "value":
        this._value = snapStep(Number(newVal), this._step, this._min, this._max);
        break;
      case "min":
        this._min = Number(newVal);
        break;
      case "max":
        this._max = Number(newVal);
        break;
      case "step":
        this._step = Math.max(0.1, Number(newVal));
        break;
      case "size":
        this._size = Math.max(16, Number(newVal));
        break;
      case "label":
        this._label = newVal ?? "";
        break;
    }
    this.update();
  }

  get value(): number { return this._value; }
  set value(v: number) {
    this._value = snapStep(v, this._step, this._min, this._max);
    this.update();
  }

  get min(): number { return this._min; }
  set min(v: number) { this._min = v; this.update(); }

  get max(): number { return this._max; }
  set max(v: number) { this._max = v; this.update(); }

  get step(): number { return this._step; }
  set step(v: number) { this._step = Math.max(0.1, v); this.update(); }

  get size(): number { return this._size; }
  set size(v: number) { this._size = Math.max(16, v); this.update(); }

  get label(): string { return this._label; }
  set label(v: string) { this._label = v; this.update(); }

  private render(): void {
    const { canvas, ctx } = setupCanvas(this);
    this.canvas = canvas;
    this.ctx = ctx;
    this.update();
    this._drag = createDragHandlers(
      (e) => {
        const rect = this.canvas!.getBoundingClientRect();
        const cx = rect.left + this._size / 2;
        const cy = rect.top + this._size / 2;
        this._dragStartAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
        const normalizedAngle = this._dragStartAngle < 0
          ? this._dragStartAngle + 2 * Math.PI
          : this._dragStartAngle;
        let ratio: number;
        if (normalizedAngle >= SA) {
          ratio = (normalizedAngle - SA) / ARC_LEN;
        } else if (normalizedAngle < WRAPPED_END) {
          ratio = (normalizedAngle + 2 * Math.PI - SA) / ARC_LEN;
        } else {
          ratio = normalizedAngle < GAP_MID ? 1 : 0;
        }
        const range = this._max - this._min;
        this._dragStartValue = this._min + Math.max(0, Math.min(1, ratio)) * range;
        this.value = this._dragStartValue;
        this.dispatchEvent(new CustomEvent("input", { detail: { value: this._value } }));
      },
      (e) => {
        const rect = this.canvas!.getBoundingClientRect();
        const cx = rect.left + this._size / 2;
        const cy = rect.top + this._size / 2;
        const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
        let deltaAngle = currentAngle - this._dragStartAngle;
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
        const range = this._max - this._min;
        this.value = this._dragStartValue + (deltaAngle / ARC_LEN) * range;
        this.dispatchEvent(new CustomEvent("input", { detail: { value: this._value } }));
      },
    );
  }

  private update(): void {
    if (!this.canvas) return;
    this.canvas.width = this._size;
    this.canvas.height = this._size;
    setAriaSlider(this, this._value, this._min, this._max, this._label);
    this.draw();
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const s = this._size;
    const cx = s / 2;
    const cy = s / 2;
    const r = s / 2 - 4;
    const range = this._max - this._min || 1;
    const ratio = (this._value - this._min) / range;
    const currentAngle = SA + ratio * ARC_LEN;

    ctx.clearRect(0, 0, s, s);

    ctx.beginPath();
    ctx.arc(cx, cy, r, SA, EA);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, SA, currentAngle);
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 3;
    ctx.stroke();

    const ix = cx + Math.cos(currentAngle) * r;
    const iy = cy + Math.sin(currentAngle) * r;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ix, iy);
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#e5e7eb";
    ctx.fill();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    let changed = false;
    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight":
        e.preventDefault();
        this.value = snapStep(this._value + this._step, this._step, this._min, this._max);
        changed = true;
        break;
      case "ArrowDown":
      case "ArrowLeft":
        e.preventDefault();
        this.value = snapStep(this._value - this._step, this._step, this._min, this._max);
        changed = true;
        break;
      case "Home":
        e.preventDefault();
        this.value = this._max;
        changed = true;
        break;
      case "End":
        e.preventDefault();
        this.value = this._min;
        changed = true;
        break;
    }
    if (changed) {
      this.dispatchEvent(new CustomEvent("input", { detail: { value: this._value } }));
    }
  };
}
