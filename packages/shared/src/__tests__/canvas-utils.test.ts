import { describe, it, expect, vi, afterEach } from "vitest";
import {
  setupCanvas,
  setAriaSlider,
  clamp,
  snapStep,
  ticksToPx,
  pxToTicks,
  createDragHandlers,
} from "../canvas-utils";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("setupCanvas", () => {
  it("crea canvas, lo appendea, retorna ctx", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const { canvas, ctx } = setupCanvas(host);
    expect(canvas.tagName).toBe("CANVAS");
    expect(host.contains(canvas)).toBe(true);
    expect(host.tabIndex).toBe(0);
    expect(typeof ctx === "object" || ctx === null).toBe(true);
  });
});

describe("setAriaSlider", () => {
  it("setea role, aria-valuenow/min/max", () => {
    const el = document.createElement("div");
    setAriaSlider(el, 50, 0, 100);
    expect(el.getAttribute("role")).toBe("slider");
    expect(el.getAttribute("aria-valuenow")).toBe("50");
    expect(el.getAttribute("aria-valuemin")).toBe("0");
    expect(el.getAttribute("aria-valuemax")).toBe("100");
  });

  it("setea aria-label cuando se pasa label", () => {
    const el = document.createElement("div");
    setAriaSlider(el, 50, 0, 100, "Volume");
    expect(el.getAttribute("aria-label")).toBe("Volume");
  });

  it("remueve aria-label cuando no se pasa label", () => {
    const el = document.createElement("div");
    el.setAttribute("aria-label", "old");
    setAriaSlider(el, 50, 0, 100);
    expect(el.hasAttribute("aria-label")).toBe(false);
  });
});

describe("clamp", () => {
  it("valores dentro de rango no cambian", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("valores por debajo del minimo retornan minimo", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("valores por encima del maximo retornan maximo", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("snapStep", () => {
  it("redondea al multiplo del step mas cercano", () => {
    expect(snapStep(4, 3, 0, 10)).toBe(3);
    expect(snapStep(5, 3, 0, 10)).toBe(6);
  });

  it("clampa a min cuando el valor esta por debajo", () => {
    expect(snapStep(-5, 3, 0, 10)).toBe(0);
  });

  it("clampa a max cuando el valor esta por encima", () => {
    expect(snapStep(8, 3, 0, 10)).toBe(9);
  });
});

describe("ticksToPx / pxToTicks", () => {
  it("ticksToPx multiplica correctamente", () => {
    expect(ticksToPx(48, 2)).toBe(96);
    expect(ticksToPx(0, 2)).toBe(0);
  });

  it("pxToTicks divide correctamente", () => {
    expect(pxToTicks(96, 2)).toBe(48);
  });

  it("pxToTicks con 0 retorna 0", () => {
    expect(pxToTicks(100, 0)).toBe(0);
  });

  it("son inversos", () => {
    expect(pxToTicks(ticksToPx(240, 1.5), 1.5)).toBe(240);
  });
});

describe("createDragHandlers", () => {
  it("attach y detach no lanzan error", () => {
    const el = document.createElement("div");
    const handlers = createDragHandlers();
    handlers.attach(el);
    handlers.detach(el);
  });

  it("llama onMove con delta correcto", () => {
    const onMove = vi.fn();
    const el = document.createElement("div");
    document.body.appendChild(el);
    const handlers = createDragHandlers(undefined, onMove);
    handlers.attach(el);
    el.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 200 }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 150, clientY: 220 }));
    expect(onMove).toHaveBeenCalledWith(expect.any(MouseEvent), 50, 20);
    handlers.detach(el);
  });

  it("llama onStart en mousedown", () => {
    const onStart = vi.fn();
    const el = document.createElement("div");
    document.body.appendChild(el);
    const handlers = createDragHandlers(onStart);
    handlers.attach(el);
    el.dispatchEvent(new MouseEvent("mousedown", { clientX: 10, clientY: 20 }));
    expect(onStart).toHaveBeenCalledOnce();
    handlers.detach(el);
  });

  it("llama onEnd en mouseup", () => {
    const onEnd = vi.fn();
    const el = document.createElement("div");
    document.body.appendChild(el);
    const handlers = createDragHandlers(undefined, undefined, onEnd);
    handlers.attach(el);
    el.dispatchEvent(new MouseEvent("mousedown", { clientX: 10, clientY: 20 }));
    document.dispatchEvent(new MouseEvent("mouseup"));
    expect(onEnd).toHaveBeenCalledOnce();
    handlers.detach(el);
  });
});
