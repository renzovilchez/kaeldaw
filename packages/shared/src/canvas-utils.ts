export function setupCanvas(host: HTMLElement): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  host.appendChild(canvas);
  host.tabIndex = 0;
  return { canvas, ctx };
}

export function setAriaSlider(
  host: HTMLElement,
  value: number,
  min: number,
  max: number,
  label?: string,
): void {
  host.setAttribute("role", "slider");
  host.setAttribute("aria-valuenow", String(value));
  host.setAttribute("aria-valuemin", String(min));
  host.setAttribute("aria-valuemax", String(max));
  if (label) {
    host.setAttribute("aria-label", label);
  } else {
    host.removeAttribute("aria-label");
  }
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function snapStep(
  v: number,
  step: number,
  min: number,
  max: number,
): number {
  const snapped = Math.round((v - min) / step) * step + min;
  return clamp(snapped, min, max);
}

export function ticksToPx(ticks: number, pixelsPerTick: number): number {
  return ticks * pixelsPerTick;
}

export function pxToTicks(px: number, pixelsPerTick: number): number {
  return pixelsPerTick === 0 ? 0 : px / pixelsPerTick;
}

type DragStartFn = (e: MouseEvent) => void;
type DragMoveFn = (e: MouseEvent, deltaX: number, deltaY: number) => void;
type DragEndFn = (e: MouseEvent) => void;

export function createDragHandlers(
  onStart?: DragStartFn,
  onMove?: DragMoveFn,
  onEnd?: DragEndFn,
) {
  let startX = 0;
  let startY = 0;
  let isDragging = false;

  function onMouseDown(e: MouseEvent) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    onStart?.(e);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    onMove?.(e, dx, dy);
  }

  function onMouseUp(e: MouseEvent) {
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    onEnd?.(e);
  }

  return {
    attach(el: HTMLElement) {
      el.addEventListener("mousedown", onMouseDown);
    },
    detach(el: HTMLElement) {
      el.removeEventListener("mousedown", onMouseDown);
    },
  };
}
