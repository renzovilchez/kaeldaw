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

  static get observedAttributes() {
    return ["value", "min", "max", "step", "width", "height", "label"];
  }

  constructor() {
    super();
    this.addEventListener("keydown", this.onKeyDown);
    this.addEventListener("mousedown", this.onMouseDown);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.removeEventListener("keydown", this.onKeyDown);
    this.removeEventListener("mousedown", this.onMouseDown);
  }

  attributeChangedCallback(_name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    switch (_name) {
      case "value":
        this._value = this.clamp(Number(newVal));
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

  get value(): number {
    return this._value;
  }

  set value(v: number) {
    this._value = this.clamp(v);
    this.update();
  }

  get min(): number {
    return this._min;
  }

  set min(v: number) {
    this._min = v;
    this.update();
  }

  get max(): number {
    return this._max;
  }

  set max(v: number) {
    this._max = v;
    this.update();
  }

  get step(): number {
    return this._step;
  }

  set step(v: number) {
    this._step = Math.max(0.1, v);
    this.update();
  }

  get width(): number {
    return this._width;
  }

  set width(v: number) {
    this._width = Math.max(12, v);
    this.update();
  }

  get height(): number {
    return this._height;
  }

  set height(v: number) {
    this._height = Math.max(24, v);
    this.update();
  }

  get label(): string {
    return this._label;
  }

  set label(v: string) {
    this._label = v;
    this.update();
  }

  private clamp(v: number): number {
    const stepped = Math.round((v - this._min) / this._step) * this._step + this._min;
    return Math.min(this._max, Math.max(this._min, stepped));
  }

  private render(): void {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.appendChild(this.canvas);
    this.tabIndex = 0;
    this.setAttribute("role", "slider");
    this.update();
  }

  private update(): void {
    if (!this.canvas) return;
    this.canvas.width = this._width;
    this.canvas.height = this._height;
    this.setAttribute("aria-valuenow", String(this._value));
    this.setAttribute("aria-valuemin", String(this._min));
    this.setAttribute("aria-valuemax", String(this._max));
    if (this._label) {
      this.setAttribute("aria-label", this._label);
    } else {
      this.removeAttribute("aria-label");
    }
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
        this.value = this._value + this._step;
        changed = true;
        break;
      case "ArrowDown":
        e.preventDefault();
        this.value = this._value - this._step;
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

  private onMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    const h = this._height;
    const thumbH = 8;
    const startY = e.clientY;
    const startVal = this._value;
    const onMove = (ev: MouseEvent): void => {
      const delta = (startY - ev.clientY) / (h - thumbH);
      const range = this._max - this._min;
      this.value = startVal + delta * range;
      this.dispatchEvent(new CustomEvent("input", { detail: { value: this._value } }));
    };
    const onUp = (): void => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
}
