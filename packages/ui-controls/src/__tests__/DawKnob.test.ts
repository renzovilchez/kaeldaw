import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { DawKnob } from "../DawKnob";

beforeAll(() => {
  if (!customElements.get("daw-knob")) {
    customElements.define("daw-knob", DawKnob);
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

function createKnob(): DawKnob {
  const knob = document.createElement("daw-knob") as DawKnob;
  document.body.appendChild(knob);
  return knob;
}

describe("DawKnob", () => {
  it("esta registrado como custom element", () => {
    const Ctor = customElements.get("daw-knob");
    expect(Ctor).toBe(DawKnob);
  });

  it("renderiza un canvas interno", () => {
    const knob = createKnob();
    const canvas = knob.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas!.tagName).toBe("CANVAS");
  });

  it("refleja atributos como propiedades (value, min, max, step, size)", () => {
    const knob = createKnob();
    knob.setAttribute("value", "50");
    knob.setAttribute("min", "0");
    knob.setAttribute("max", "100");
    knob.setAttribute("step", "5");
    knob.setAttribute("size", "64");
    expect(knob.value).toBe(50);
    expect(knob.min).toBe(0);
    expect(knob.max).toBe(100);
    expect(knob.step).toBe(5);
    expect(knob.size).toBe(64);
  });

  it("value se clamp entre min y max", () => {
    const knob = createKnob();
    knob.min = 10;
    knob.max = 50;
    knob.value = 5;
    expect(knob.value).toBe(10);
    knob.value = 100;
    expect(knob.value).toBe(50);
  });

  it("atributo size define dimensiones del canvas", () => {
    const knob = createKnob();
    knob.size = 64;
    const canvas = knob.querySelector("canvas")!;
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(64);
  });

  it("label vacio no genera aria-label", () => {
    const knob = createKnob();
    expect(knob.hasAttribute("aria-label")).toBe(false);
  });

  it("label pobla aria-label", () => {
    const knob = createKnob();
    knob.setAttribute("label", "Volume");
    expect(knob.getAttribute("aria-label")).toBe("Volume");
  });

  it("step redondea el valor al multiplo mas cercano", () => {
    const knob = createKnob();
    knob.min = 0;
    knob.max = 10;
    knob.step = 3;
    knob.value = 4;
    expect(knob.value).toBe(3);
    knob.value = 5;
    expect(knob.value).toBe(6);
  });

  it("expone role=slider y aria-* attributes", () => {
    const knob = createKnob();
    knob.min = 0;
    knob.max = 127;
    knob.value = 64;
    expect(knob.getAttribute("role")).toBe("slider");
    expect(knob.getAttribute("aria-valuenow")).toBe("64");
    expect(knob.getAttribute("aria-valuemin")).toBe("0");
    expect(knob.getAttribute("aria-valuemax")).toBe("127");
  });
});
