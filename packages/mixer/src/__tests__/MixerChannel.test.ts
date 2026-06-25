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

function buttons(ch: MixerChannel): HTMLButtonElement[] {
  return Array.from(ch.querySelectorAll("button"));
}

describe("MixerChannel", () => {
  it("esta registrado como custom element", () => {
    const Ctor = customElements.get("daw-mixer-channel");
    expect(Ctor).toBe(MixerChannel);
  });

  it("renderiza nombre del canal", () => {
    const ch = createChannel();
    ch.channelName = "Kick";
    const spans = ch.querySelectorAll("span");
    expect(spans.length).toBeGreaterThan(1);
    expect(spans[1].textContent).toBe("Kick");
  });

  it("channel-name attribute se refleja en el span", () => {
    const ch = createChannel();
    ch.setAttribute("channel-name", "Snare");
    expect(ch.channelName).toBe("Snare");
    const spans = ch.querySelectorAll("span");
    expect(spans[1].textContent).toBe("Snare");
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

  it("mute attr muestra boton M con fondo rojo (primer button)", () => {
    const ch = createChannel();
    ch.setAttribute("mute", "");
    expect(ch.mute).toBe(true);
    const btns = buttons(ch);
    expect(btns[0].style.background).toBe("rgb(220, 38, 38)");
  });

  it("solo attr muestra boton S con fondo amarillo (segundo button)", () => {
    const ch = createChannel();
    ch.setAttribute("solo", "");
    expect(ch.solo).toBe(true);
    const btns = buttons(ch);
    expect(btns[1].style.background).toBe("rgb(202, 138, 4)");
  });

  it("click mute button emite toggle-mute", () => {
    const ch = createChannel();
    ch.channelId = "ch-1";
    const handler = vi.fn();
    ch.addEventListener("toggle-mute", handler);
    buttons(ch)[0].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ channelId: "ch-1", mute: true });
  });

  it("click solo button emite toggle-solo", () => {
    const ch = createChannel();
    ch.channelId = "ch-1";
    const handler = vi.fn();
    ch.addEventListener("toggle-solo", handler);
    buttons(ch)[1].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ channelId: "ch-1", solo: true });
  });

  it("click D button emite insert-delay-change", () => {
    const ch = createChannel();
    ch.channelId = "ch-1";
    const handler = vi.fn();
    ch.addEventListener("insert-delay-change", handler);
    buttons(ch)[2].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ channelId: "ch-1", enabled: true });
  });

  it("click R button emite insert-reverb-change", () => {
    const ch = createChannel();
    ch.channelId = "ch-1";
    const handler = vi.fn();
    ch.addEventListener("insert-reverb-change", handler);
    buttons(ch)[3].click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ channelId: "ch-1", enabled: true });
  });

  it("insert-delay attr activa boton azul", () => {
    const ch = createChannel();
    ch.setAttribute("insert-delay", "true");
    expect(ch.insertDelay).toBe(true);
    expect(buttons(ch)[2].style.background).toBe("rgb(59, 130, 246)");
  });

  it("insert-reverb attr activa boton azul", () => {
    const ch = createChannel();
    ch.setAttribute("insert-reverb", "true");
    expect(ch.insertReverb).toBe(true);
    expect(buttons(ch)[3].style.background).toBe("rgb(59, 130, 246)");
  });

  it("pan attr setea valor en knob interno", () => {
    const ch = createChannel();
    ch.setAttribute("pan", "1");
    const knobs = ch.querySelectorAll("daw-knob");
    expect(knobs.length).toBeGreaterThanOrEqual(2);
    expect(knobs[1].getAttribute("value")).toBe("1000");
  });

  it("send-level attr setea valor en send knob", () => {
    const ch = createChannel();
    ch.setAttribute("send-level", "0.5");
    expect(ch.sendLevel).toBe(0.5);
    const knobs = ch.querySelectorAll("daw-knob");
    expect(knobs[0].getAttribute("value")).toBe("500");
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

  it("send knob input emite send-level-change", () => {
    const ch = createChannel();
    ch.channelId = "ch-1";
    const handler = vi.fn();
    ch.addEventListener("send-level-change", handler);
    const knobs = ch.querySelectorAll("daw-knob");
    knobs[0].dispatchEvent(new CustomEvent("input", { detail: { value: 500 } }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ channelId: "ch-1", level: 0.5 });
  });

  it("disconnectedCallback limpia listeners y no crashea", () => {
    const ch = createChannel();
    ch.remove();
    expect(document.body.contains(ch)).toBe(false);
  });
});