import { setupCanvas, setAriaSlider, snapStep, createDragHandlers } from "@kaeldaw/shared/canvas-utils";

export class DawFader extends HTMLElement {
  private _value = 0;
  private _min = 0;
  private _max = 127;
  private _step = 1;
  private _width = 24;
  private _height = 120;
  private _label = "";
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private _drag: ReturnType<typeof createDragHandlers> | null = null;
  private _dragStartValue = 0;

  static get observedAttributes() {
    return ["value", "min", "max", "step", "width", "height", "label"];
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
      case "width":
        this._width = Math.max(12, Number(newVal));
        break;
      case "height":
        this._height = Math.max(24, Number(newVal));
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

  get width(): number { return this._width; }
  set width(v: number) { this._width = Math.max(12, v); this.update(); }

  get height(): number { return this._height; }
  set height(v: number) { this._height = Math.max(24, v); this.update(); }

  get label(): string { return this._label; }
  set label(v: string) { this._label = v; this.update(); }

  private render(): void {
    const { canvas, ctx } = setupCanvas(this);
    this.canvas = canvas;
    this.ctx = ctx;
    this._drag = createDragHandlers(
      (e) => {
        const rect = this.canvas!.getBoundingClientRect();
        const y = (e.clientY - rect.top) / this._height;
        const ratio = 1 - Math.max(0, Math.min(1, y));
        const range = this._max - this._min;
        this._dragStartValue = this._min + ratio * range;
        this.value = this._dragStartValue;
        this.dispatchEvent(new CustomEvent("input", { detail: { value: this._value } }));
      },
      (_, _dx, dy) => {
        const range = this._max - this._min;
        this.value = this._dragStartValue - (dy / this._height) * range;
        this.dispatchEvent(new CustomEvent("input", { detail: { value: this._value } }));
      },
    );
    this.update();
  }

  private update(): void {
    if (!this.canvas) return;
    this.canvas.width = this._width;
    this.canvas.height = this._height;
    setAriaSlider(this, this._value, this._min, this._max, this._label);
    this.draw();
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this._width;
    const h = this._height;
    const railW = 6;
    const railX = (w - railW) / 2;
    const thumbH = 8;
    const range = this._max - this._min || 1;
    const ratio = (this._value - this._min) / range;
    const thumbY = (h - thumbH) * (1 - ratio);

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#333";
    ctx.fillRect(railX, 0, railW, h);

    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(railX, thumbY + thumbH / 2, railW, h - thumbY - thumbH / 2);

    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(0, thumbY, w, thumbH);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    let changed = false;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        this.value = snapStep(this._value + this._step, this._step, this._min, this._max);
        changed = true;
        break;
      case "ArrowDown":
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
