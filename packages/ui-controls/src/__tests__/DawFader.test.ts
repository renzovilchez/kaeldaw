import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { DawFader } from "../DawFader";

beforeAll(() => {
  if (!customElements.get("daw-fader")) {
    customElements.define("daw-fader", DawFader);
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

function createFader(): DawFader {
  const fader = document.createElement("daw-fader") as DawFader;
  document.body.appendChild(fader);
  return fader;
}

describe("DawFader", () => {
  it("esta registrado como custom element", () => {
    const Ctor = customElements.get("daw-fader");
    expect(Ctor).toBe(DawFader);
  });

  it("renderiza un canvas interno con dimensiones default", () => {
    const fader = createFader();
    const canvas = fader.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas!.tagName).toBe("CANVAS");
    expect(canvas!.width).toBe(24);
    expect(canvas!.height).toBe(120);
  });

  it("refleja atributos como propiedades", () => {
    const fader = createFader();
    fader.setAttribute("value", "64");
    fader.setAttribute("min", "0");
    fader.setAttribute("max", "100");
    fader.setAttribute("step", "5");
    fader.setAttribute("width", "32");
    fader.setAttribute("height", "200");
    expect(fader.value).toBe(64);
    expect(fader.min).toBe(0);
    expect(fader.max).toBe(100);
    expect(fader.step).toBe(5);
    expect(fader.width).toBe(32);
    expect(fader.height).toBe(200);
  });

  it("value se clamp entre min y max", () => {
    const fader = createFader();
    fader.min = 10;
    fader.max = 50;
    fader.value = 5;
    expect(fader.value).toBe(10);
    fader.value = 100;
    expect(fader.value).toBe(50);
  });

  it("step redondea el valor al multiplo mas cercano", () => {
    const fader = createFader();
    fader.min = 0;
    fader.max = 10;
    fader.step = 3;
    fader.value = 4;
    expect(fader.value).toBe(3);
    fader.value = 5;
    expect(fader.value).toBe(6);
  });

  it("label pobla aria-label", () => {
    const fader = createFader();
    fader.setAttribute("label", "Volume");
    expect(fader.getAttribute("aria-label")).toBe("Volume");
  });

  it("expone role=slider y aria-* attributes", () => {
    const fader = createFader();
    fader.min = 0;
    fader.max = 127;
    fader.value = 64;
    expect(fader.getAttribute("role")).toBe("slider");
    expect(fader.getAttribute("aria-valuenow")).toBe("64");
    expect(fader.getAttribute("aria-valuemin")).toBe("0");
    expect(fader.getAttribute("aria-valuemax")).toBe("127");
  });
});
