import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { MixerChannel } from "../MixerChannel";

beforeAll(() => {
  if (!customElements.get("daw-fader")) {
    customElements.define("daw-fader", class extends HTMLElement {
      private _value = 0;
      get value() { return this._value; }
      set value(v: number) { this._value = v; }
      connectedCallback() { this.setAttribute("role", "slider"); }
      static get observedAttributes() { return ["value", "min", "max"]; }
      attributeChangedCallback(name: string, _old: string | null, val: string | null) {
        if (name === "value") this._value = Number(val);
      }
    } as CustomElementConstructor);
  }
  if (!customElements.get("daw-knob")) {
    customElements.define("daw-knob", class extends HTMLElement {
      private _value = 0;
      get value() { return this._value; }
      set value(v: number) { this._value = v; }
      static get observedAttributes() { return ["value", "min", "max"]; }
      attributeChangedCallback(name: string, _old: string | null, val: string | null) {
        if (name === "value") this._value = Number(val);
      }
    } as CustomElementConstructor);
  }
  if (!customElements.get("daw-mixer-channel")) {
    customElements.define("daw-mixer-channel", MixerChannel);
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

function createChannel(): MixerChannel {
  const el = document.createElement("daw-mixer-channel") as MixerChannel;
  document.body.appendChild(el);
  return el;
}

describe("MixerChannel", () => {
  it("esta registrado como custom element", () => {
    const Ctor = customElements.get("daw-mixer-channel");
    expect(Ctor).toBe(MixerChannel);
  });

  it("renderiza nombre del canal", () => {
    const ch = createChannel();
    ch.channelName = "Kick";
    const nameEl = ch.querySelector("span");
    expect(nameEl).not.toBeNull();
    expect(nameEl!.textContent).toBe("Kick");
  });

  it("channel-name attribute se refleja en el span", () => {
    const ch = createChannel();
    ch.setAttribute("channel-name", "Snare");
    expect(ch.channelName).toBe("Snare");
    const nameEl = ch.querySelector("span");
    expect(nameEl!.textContent).toBe("Snare");
  });

  it("volume se clamp entre 0 y 1", () => {
    const ch = createChannel();
    ch.volume = 1.5;
    expect(ch.volume).toBe(1);
    ch.volume = -0.5;
    expect(ch.volume).toBe(0);
  });

  it("volume attr setea valor en fader interno", () => {
    const ch = createChannel();
    ch.setAttribute("volume", "0.5");
    const fader = ch.querySelector("daw-fader");
    expect(fader).not.toBeNull();
    expect(fader!.getAttribute("value")).toBe("500");
  });

  it("mute attr muestra boton con fondo rojo", () => {
    const ch = createChannel();
    ch.setAttribute("mute", "");
    expect(ch.mute).toBe(true);
    const btns = ch.querySelectorAll("button");
    const muteBtn = btns[2];
    expect(muteBtn!.style.background).toBe("rgb(220, 38, 38)");
  });

  it("solo attr muestra boton con fondo amarillo", () => {
    const ch = createChannel();
    ch.setAttribute("solo", "");
    expect(ch.solo).toBe(true);
    const btns = ch.querySelectorAll("button");
    expect(btns[3].style.background).toBe("rgb(202, 138, 4)");
  });

  it("click mute button emite toggle-mute", () => {
    const ch = createChannel();
    ch.channelId = "ch-1";
    const handler = vi.fn();
    ch.addEventListener("toggle-mute", handler);
    const btns = ch.querySelectorAll("button");
    btns[2].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ channelId: "ch-1", mute: true });
  });

  it("click solo button emite toggle-solo", () => {
    const ch = createChannel();
    ch.channelId = "ch-1";
    const handler = vi.fn();
    ch.addEventListener("toggle-solo", handler);
    const btns = ch.querySelectorAll("button");
    btns[3].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ channelId: "ch-1", solo: true });
  });

  it("pan attr setea valor en knob interno", () => {
    const ch = createChannel();
    ch.setAttribute("pan", "1");
    const knob = ch.querySelector("daw-knob");
    expect(knob).not.toBeNull();
    expect(knob!.getAttribute("value")).toBe("1000");
  });

  it("meterLevel actualiza barra VU", () => {
    const ch = createChannel();
    ch.meterLevel = 0.5;
    const vuFill = ch.querySelector("div > div") as HTMLDivElement;
    expect(vuFill).not.toBeNull();
    expect(vuFill.style.height).toBe("50%");
  });

  it("meterLevel niveles altos muestran rojo", () => {
    const ch = createChannel();
    ch.meterLevel = 0.95;
    const vuFill = ch.querySelector("div > div") as HTMLDivElement;
    expect(vuFill.style.background).toBe("rgb(239, 68, 68)");
  });

  it("fader input emite volume-change con channelId", () => {
    const ch = createChannel();
    ch.channelId = "ch-1";
    ch.volume = 0.5;
    const handler = vi.fn();
    ch.addEventListener("volume-change", handler);
    const fader = ch.querySelector("daw-fader")!;
    fader.dispatchEvent(new CustomEvent("input", { detail: { value: 800 } }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ channelId: "ch-1", volume: 0.8 });
  });

  it("disconnectedCallback limpia listeners y no crashea", () => {
    const ch = createChannel();
    ch.remove();
    expect(document.body.contains(ch)).toBe(false);
  });
});
