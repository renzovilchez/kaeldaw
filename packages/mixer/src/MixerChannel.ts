export class MixerChannel extends HTMLElement {
  private _channelName = "";
  private _volume = 0.75;
  private _pan = 0;
  private _mute = false;
  private _solo = false;
  private _meterLevel = 0;
  private _channelId = "";

  private _nameEl: HTMLSpanElement | null = null;
  private _vuFill: HTMLDivElement | null = null;
  private _fader: HTMLElement | null = null;
  private _muteBtn: HTMLButtonElement | null = null;
  private _soloBtn: HTMLButtonElement | null = null;
  private _panKnob: HTMLElement | null = null;

  private _onFaderInput: (e: Event) => void;
  private _onPanInput: (e: Event) => void;
  private _onMuteClick: () => void;
  private _onSoloClick: () => void;

  static get observedAttributes() {
    return ["channel-name", "volume", "pan", "mute", "solo", "meter-level", "channel-id"];
  }

  constructor() {
    super();
    this._onFaderInput = this._handleFaderInput.bind(this);
    this._onPanInput = this._handlePanInput.bind(this);
    this._onMuteClick = this._handleMuteClick.bind(this);
    this._onSoloClick = this._handleSoloClick.bind(this);
  }

  connectedCallback() {
    this._buildUI();
  }

  disconnectedCallback() {
    this._fader?.removeEventListener("input", this._onFaderInput);
    this._panKnob?.removeEventListener("input", this._onPanInput);
    this._muteBtn?.removeEventListener("click", this._onMuteClick);
    this._soloBtn?.removeEventListener("click", this._onSoloClick);
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    switch (name) {
      case "channel-name": this.channelName = newVal ?? ""; break;
      case "volume": this.volume = Number(newVal) || 0; break;
      case "pan": this.pan = Number(newVal) || 0; break;
      case "mute": this.mute = newVal !== null; break;
      case "solo": this.solo = newVal !== null; break;
      case "meter-level": this.meterLevel = Number(newVal) || 0; break;
      case "channel-id": this.channelId = newVal ?? ""; break;
    }
  }

  // --- Properties ---

  get channelName(): string { return this._channelName; }
  set channelName(v: string) {
    this._channelName = v;
    if (this._nameEl) this._nameEl.textContent = v;
  }

  get volume(): number { return this._volume; }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._fader) {
      this._fader.setAttribute("value", String(Math.round(this._volume * 1000)));
    }
  }

  get pan(): number { return this._pan; }
  set pan(v: number) {
    this._pan = Math.max(-1, Math.min(1, v));
    if (this._panKnob) {
      this._panKnob.setAttribute("value", String(Math.round((this._pan + 1) / 2 * 1000)));
    }
  }

  get mute(): boolean { return this._mute; }
  set mute(v: boolean) {
    this._mute = v;
    this._updateMuteBtn();
    if (v) this.setAttribute("mute", "");
    else this.removeAttribute("mute");
  }

  get solo(): boolean { return this._solo; }
  set solo(v: boolean) {
    this._solo = v;
    this._updateSoloBtn();
    if (v) this.setAttribute("solo", "");
    else this.removeAttribute("solo");
  }

  get meterLevel(): number { return this._meterLevel; }
  set meterLevel(v: number) {
    this._meterLevel = Math.max(0, Math.min(1, v));
    this._updateVU();
  }

  get channelId(): string { return this._channelId; }
  set channelId(v: string) { this._channelId = v; }

  // --- UI build ---

  private _buildUI() {
    this.style.display = "inline-flex";
    this.style.flexDirection = "column";
    this.style.alignItems = "center";
    this.style.width = "48px";
    this.style.padding = "4px";
    this.style.gap = "2px";
    this.style.background = "#14151f";
    this.style.borderRadius = "4px";

    // Name
    this._nameEl = document.createElement("span");
    this._nameEl.textContent = this._channelName;
    this._nameEl.style.cssText = "font-size:9px;color:#888;text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    this.appendChild(this._nameEl);

    // VU Meter
    const vuContainer = document.createElement("div");
    vuContainer.style.cssText = "width:100%;height:4px;background:#2a2a4e;border-radius:2px;overflow:hidden";
    this._vuFill = document.createElement("div");
    this._vuFill.style.cssText = "height:100%;width:0%;border-radius:2px;transition:width 50ms";
    vuContainer.appendChild(this._vuFill);
    this.appendChild(vuContainer);
    this._updateVU();

    // Fader
    this._fader = document.createElement("daw-fader");
    this._fader.setAttribute("min", "0");
    this._fader.setAttribute("max", "1000");
    this._fader.setAttribute("width", "6");
    this._fader.setAttribute("height", "80");
    this._fader.setAttribute("value", String(Math.round(this._volume * 1000)));
    this._fader.addEventListener("input", this._onFaderInput);
    this.appendChild(this._fader);

    // Bottom row: M S Pan
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:1px";

    // Mute button
    this._muteBtn = document.createElement("button");
    this._muteBtn.textContent = "M";
    this._muteBtn.style.cssText = "width:18px;height:14px;font-size:7px;font-weight:bold;border:none;border-radius:2px;cursor:pointer";
    this._updateMuteBtn();
    this._muteBtn.addEventListener("click", this._onMuteClick);
    row.appendChild(this._muteBtn);

    // Solo button
    this._soloBtn = document.createElement("button");
    this._soloBtn.textContent = "S";
    this._soloBtn.style.cssText = "width:18px;height:14px;font-size:7px;font-weight:bold;border:none;border-radius:2px;cursor:pointer";
    this._updateSoloBtn();
    this._soloBtn.addEventListener("click", this._onSoloClick);
    row.appendChild(this._soloBtn);

    // Pan knob
    this._panKnob = document.createElement("daw-knob");
    this._panKnob.setAttribute("min", "0");
    this._panKnob.setAttribute("max", "1000");
    this._panKnob.setAttribute("size", "16");
    this._panKnob.setAttribute("value", String(Math.round((this._pan + 1) / 2 * 1000)));
    this._panKnob.addEventListener("input", this._onPanInput);
    row.appendChild(this._panKnob);

    this.appendChild(row);
  }

  private _updateMuteBtn() {
    if (!this._muteBtn) return;
    this._muteBtn.style.background = this._mute ? "#dc2626" : "#333";
    this._muteBtn.style.color = this._mute ? "#fff" : "#888";
  }

  private _updateSoloBtn() {
    if (!this._soloBtn) return;
    this._soloBtn.style.background = this._solo ? "#ca8a04" : "#333";
    this._soloBtn.style.color = this._solo ? "#fff" : "#888";
  }

  private _updateVU() {
    if (!this._vuFill) return;
    const pct = Math.round(this._meterLevel * 100);
    this._vuFill.style.width = `${pct}%`;
    if (this._meterLevel < 0.7) {
      this._vuFill.style.background = "#22c55e";
    } else if (this._meterLevel < 0.9) {
      this._vuFill.style.background = "#eab308";
    } else {
      this._vuFill.style.background = "#ef4444";
    }
  }

  // --- Handlers ---

  private _handleFaderInput(e: Event) {
    const value = (e as CustomEvent).detail.value;
    this._volume = Math.max(0, Math.min(1, value / 1000));
    this.dispatchEvent(new CustomEvent("volume-change", {
      detail: { channelId: this._channelId, volume: this._volume },
    }));
  }

  private _handlePanInput(e: Event) {
    const value = (e as CustomEvent).detail.value;
    this._pan = Math.max(-1, Math.min(1, (value / 1000) * 2 - 1));
    this.dispatchEvent(new CustomEvent("pan-change", {
      detail: { channelId: this._channelId, pan: this._pan },
    }));
  }

  private _handleMuteClick() {
    this._mute = !this._mute;
    this._updateMuteBtn();
    this.dispatchEvent(new CustomEvent("toggle-mute", {
      detail: { channelId: this._channelId, mute: this._mute },
    }));
  }

  private _handleSoloClick() {
    this._solo = !this._solo;
    this._updateSoloBtn();
    this.dispatchEvent(new CustomEvent("toggle-solo", {
      detail: { channelId: this._channelId, solo: this._solo },
    }));
  }
}

if (!customElements.get("daw-mixer-channel")) {
  customElements.define("daw-mixer-channel", MixerChannel);
}
