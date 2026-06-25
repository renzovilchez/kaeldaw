export class MixerChannel extends HTMLElement {
  private _channelName = "";
  private _channelNumber = "";
  private _volume = 0.75;
  private _pan = 0;
  private _mute = false;
  private _solo = false;
  private _meterLevel = 0;
  private _channelId = "";
  private _insertDelay = false;
  private _insertReverb = false;
  private _sendLevel = 0;

  private _numEl: HTMLSpanElement | null = null;
  private _nameEl: HTMLSpanElement | null = null;
  private _vuFill: HTMLDivElement | null = null;
  private _vuPeak: HTMLDivElement | null = null;
  private _fader: HTMLElement | null = null;
  private _muteBtn: HTMLButtonElement | null = null;
  private _soloBtn: HTMLButtonElement | null = null;
  private _delayBtn: HTMLButtonElement | null = null;
  private _reverbBtn: HTMLButtonElement | null = null;
  private _panKnob: HTMLElement | null = null;
  private _sendKnob: HTMLElement | null = null;
  private _volLabel: HTMLDivElement | null = null;
  private _panLabel: HTMLSpanElement | null = null;
  private _sendLabel: HTMLSpanElement | null = null;

  private _onFaderInput: (e: Event) => void;
  private _onPanInput: (e: Event) => void;
  private _onSendInput: (e: Event) => void;
  private _onMuteClick: () => void;
  private _onSoloClick: () => void;
  private _onDelayClick: () => void;
  private _onReverbClick: () => void;

  static get observedAttributes() {
    return ["channel-name", "channel-number", "volume", "pan", "mute", "solo", "meter-level", "channel-id", "insert-delay", "insert-reverb", "send-level"];
  }

  constructor() {
    super();
    this._onFaderInput = this._handleFaderInput.bind(this);
    this._onPanInput = this._handlePanInput.bind(this);
    this._onSendInput = this._handleSendInput.bind(this);
    this._onMuteClick = this._handleMuteClick.bind(this);
    this._onSoloClick = this._handleSoloClick.bind(this);
    this._onDelayClick = this._handleDelayClick.bind(this);
    this._onReverbClick = this._handleReverbClick.bind(this);
  }

  connectedCallback() {
    this._buildUI();
  }

  disconnectedCallback() {
    this._fader?.removeEventListener("input", this._onFaderInput);
    this._panKnob?.removeEventListener("input", this._onPanInput);
    this._sendKnob?.removeEventListener("input", this._onSendInput);
    this._muteBtn?.removeEventListener("click", this._onMuteClick);
    this._soloBtn?.removeEventListener("click", this._onSoloClick);
    this._delayBtn?.removeEventListener("click", this._onDelayClick);
    this._reverbBtn?.removeEventListener("click", this._onReverbClick);
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    switch (name) {
      case "channel-name": this.channelName = newVal ?? ""; break;
      case "channel-number": this.channelNumber = newVal ?? ""; break;
      case "volume": this.volume = Number(newVal) || 0; break;
      case "pan": this.pan = Number(newVal) || 0; break;
      case "mute": this.mute = newVal !== null; break;
      case "solo": this.solo = newVal !== null; break;
      case "meter-level": this.meterLevel = Number(newVal) || 0; break;
      case "channel-id": this.channelId = newVal ?? ""; break;
      case "insert-delay": this.insertDelay = newVal === "true"; break;
      case "insert-reverb": this.insertReverb = newVal === "true"; break;
      case "send-level": this.sendLevel = Number(newVal) || 0; break;
    }
  }

  get channelName(): string { return this._channelName; }
  set channelName(v: string) {
    this._channelName = v;
    if (this._nameEl) this._nameEl.textContent = v;
  }

  get channelNumber(): string { return this._channelNumber; }
  set channelNumber(v: string) {
    this._channelNumber = v;
    if (this._numEl) this._numEl.textContent = v;
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

  get insertDelay(): boolean { return this._insertDelay; }
  set insertDelay(v: boolean) {
    this._insertDelay = v;
    this._updateDelayBtn();
  }

  get insertReverb(): boolean { return this._insertReverb; }
  set insertReverb(v: boolean) {
    this._insertReverb = v;
    this._updateReverbBtn();
  }

  get sendLevel(): number { return this._sendLevel; }
  set sendLevel(v: number) {
    this._sendLevel = Math.max(0, Math.min(1, v));
    if (this._sendKnob) {
      this._sendKnob.setAttribute("value", String(Math.round(this._sendLevel * 1000)));
    }
    if (this._sendLabel) {
      this._sendLabel.textContent = this._sendLevel > 0 ? `${Math.round(this._sendLevel * 100)}%` : "Off";
    }
  }

  private _buildUI() {
    this.style.cssText = "display:inline-flex;flex-direction:column;align-items:center;width:60px;padding:2px 3px;gap:1px;background:#353535;border-radius:4px;border:1px solid #4a4a4a";

    this._numEl = document.createElement("span");
    this._numEl.style.cssText = "font-size:9px;color:#666;text-align:center;width:100%;line-height:12px;font-weight:600";
    this._numEl.textContent = this._channelNumber;
    this.appendChild(this._numEl);

    this._nameEl = document.createElement("span");
    this._nameEl.style.cssText = "font-size:7px;color:#aaa;text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:10px;margin-bottom:1px";
    this._nameEl.textContent = this._channelName;
    this.appendChild(this._nameEl);

    const sep = document.createElement("div");
    sep.style.cssText = "width:80%;height:1px;background:#4a4a4a;margin:1px 0";
    this.appendChild(sep);

    const vuContainer = document.createElement("div");
    vuContainer.style.cssText = "width:100%;height:35px;background:#2a2a2a;border-radius:2px;overflow:hidden;position:relative;border:1px solid #444";
    this._vuFill = document.createElement("div");
    this._vuFill.style.cssText = "position:absolute;bottom:0;left:0;width:100%;height:0%;border-radius:1px;transition:height 40ms";
    vuContainer.appendChild(this._vuFill);
    this._vuPeak = document.createElement("div");
    this._vuPeak.style.cssText = "position:absolute;bottom:0;left:0;width:100%;height:2px;background:#fff;transition:bottom 100ms";
    vuContainer.appendChild(this._vuPeak);
    this.appendChild(vuContainer);
    this._updateVU();

    this._fader = document.createElement("daw-fader");
    this._fader.setAttribute("min", "0");
    this._fader.setAttribute("max", "1000");
    this._fader.setAttribute("step", "10");
    this._fader.setAttribute("width", "12");
    this._fader.setAttribute("height", "72");
    this._fader.setAttribute("value", String(Math.round(this._volume * 1000)));
    this._fader.addEventListener("input", this._onFaderInput);
    this.appendChild(this._fader);

    this._volLabel = document.createElement("div");
    this._volLabel.style.cssText = "font-size:7px;color:#888;line-height:10px";
    this._volLabel.textContent = `${Math.round(this._volume * 100)}%`;
    this.appendChild(this._volLabel);

    const sendRow = document.createElement("div");
    sendRow.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;gap:2px";
    this._sendKnob = document.createElement("daw-knob");
    this._sendKnob.setAttribute("min", "0");
    this._sendKnob.setAttribute("max", "1000");
    this._sendKnob.setAttribute("step", "10");
    this._sendKnob.setAttribute("size", "16");
    this._sendKnob.setAttribute("value", String(Math.round(this._sendLevel * 1000)));
    this._sendKnob.addEventListener("input", this._onSendInput);
    sendRow.appendChild(this._sendKnob);
    this._sendLabel = document.createElement("span");
    this._sendLabel.style.cssText = "font-size:6px;color:#666;width:20px;display:inline-block;text-align:center";
    this._sendLabel.textContent = this._sendLevel > 0 ? `${Math.round(this._sendLevel * 100)}%` : "Off";
    sendRow.appendChild(this._sendLabel);
    this.appendChild(sendRow);

    const panRow = document.createElement("div");
    panRow.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%";
    this._panKnob = document.createElement("daw-knob");
    this._panKnob.setAttribute("min", "0");
    this._panKnob.setAttribute("max", "1000");
    this._panKnob.setAttribute("step", "5");
    this._panKnob.setAttribute("size", "24");
    this._panKnob.setAttribute("value", String(Math.round((this._pan + 1) / 2 * 1000)));
    this._panKnob.addEventListener("input", this._onPanInput);
    panRow.appendChild(this._panKnob);
    this._panLabel = document.createElement("span");
    this._panLabel.style.cssText = "font-size:6px;color:#666;width:18px;display:inline-block;text-align:center";
    this._panLabel.textContent = this._panText();
    panRow.appendChild(this._panLabel);
    this.appendChild(panRow);

    const msdrRow = document.createElement("div");
    msdrRow.style.cssText = "display:flex;gap:1px;width:100%";

    this._muteBtn = document.createElement("button");
    this._muteBtn.textContent = "M";
    this._muteBtn.style.cssText = "flex:1;height:14px;font-size:7px;font-weight:bold;border:none;border-radius:1px;cursor:pointer";
    this._updateMuteBtn();
    this._muteBtn.addEventListener("click", this._onMuteClick);
    msdrRow.appendChild(this._muteBtn);

    this._soloBtn = document.createElement("button");
    this._soloBtn.textContent = "S";
    this._soloBtn.style.cssText = "flex:1;height:14px;font-size:7px;font-weight:bold;border:none;border-radius:1px;cursor:pointer";
    this._updateSoloBtn();
    this._soloBtn.addEventListener("click", this._onSoloClick);
    msdrRow.appendChild(this._soloBtn);

    this._delayBtn = document.createElement("button");
    this._delayBtn.textContent = "D";
    this._delayBtn.style.cssText = "flex:1;height:14px;font-size:7px;font-weight:bold;border:none;border-radius:1px;cursor:pointer";
    this._updateDelayBtn();
    this._delayBtn.addEventListener("click", this._onDelayClick);
    msdrRow.appendChild(this._delayBtn);

    this._reverbBtn = document.createElement("button");
    this._reverbBtn.textContent = "R";
    this._reverbBtn.style.cssText = "flex:1;height:14px;font-size:7px;font-weight:bold;border:none;border-radius:1px;cursor:pointer";
    this._updateReverbBtn();
    this._reverbBtn.addEventListener("click", this._onReverbClick);
    msdrRow.appendChild(this._reverbBtn);

    this.appendChild(msdrRow);
  }

  private _panText(): string {
    if (Math.abs(this._pan * 100) < 1) return "C";
    return this._pan > 0 ? `R${Math.round(this._pan * 100)}` : `L${Math.round(-this._pan * 100)}`;
  }

  private _updateMuteBtn() {
    if (!this._muteBtn) return;
    this._muteBtn.style.background = this._mute ? "#dc2626" : "#3a3a3a";
    this._muteBtn.style.color = this._mute ? "#fff" : "#888";
  }

  private _updateSoloBtn() {
    if (!this._soloBtn) return;
    this._soloBtn.style.background = this._solo ? "#ca8a04" : "#3a3a3a";
    this._soloBtn.style.color = this._solo ? "#fff" : "#888";
  }

  private _updateDelayBtn() {
    if (!this._delayBtn) return;
    this._delayBtn.style.background = this._insertDelay ? "#3b82f6" : "#3a3a3a";
    this._delayBtn.style.color = this._insertDelay ? "#fff" : "#888";
  }

  private _updateReverbBtn() {
    if (!this._reverbBtn) return;
    this._reverbBtn.style.background = this._insertReverb ? "#3b82f6" : "#3a3a3a";
    this._reverbBtn.style.color = this._insertReverb ? "#fff" : "#888";
  }

  private _updateVU() {
    if (!this._vuFill) return;
    const pct = Math.round(this._meterLevel * 100);
    this._vuFill.style.height = `${pct}%`;
    if (this._meterLevel < 0.7) {
      this._vuFill.style.background = "#22c55e";
    } else if (this._meterLevel < 0.9) {
      this._vuFill.style.background = "#eab308";
    } else {
      this._vuFill.style.background = "#ef4444";
    }
    if (pct > 0 && this._vuPeak) {
      this._vuPeak.style.bottom = `${pct}%`;
    }
  }

  private _handleFaderInput(e: Event) {
    const value = (e as CustomEvent).detail.value;
    this._volume = Math.max(0, Math.min(1, value / 1000));
    if (this._volLabel) this._volLabel.textContent = `${Math.round(this._volume * 100)}%`;
    this.dispatchEvent(new CustomEvent("volume-change", {
      detail: { channelId: this._channelId, volume: this._volume },
    }));
  }

  private _handlePanInput(e: Event) {
    const value = (e as CustomEvent).detail.value;
    this._pan = Math.max(-1, Math.min(1, (value / 1000) * 2 - 1));
    if (this._panLabel) this._panLabel.textContent = this._panText();
    this.dispatchEvent(new CustomEvent("pan-change", {
      detail: { channelId: this._channelId, pan: this._pan },
    }));
  }

  private _handleSendInput(e: Event) {
    const value = (e as CustomEvent).detail.value;
    this._sendLevel = Math.max(0, Math.min(1, value / 1000));
    if (this._sendLabel) this._sendLabel.textContent = this._sendLevel > 0 ? `${Math.round(this._sendLevel * 100)}%` : "Off";
    this.dispatchEvent(new CustomEvent("send-level-change", {
      detail: { channelId: this._channelId, level: this._sendLevel },
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

  private _handleDelayClick() {
    this._insertDelay = !this._insertDelay;
    this._updateDelayBtn();
    this.dispatchEvent(new CustomEvent("insert-delay-change", {
      detail: { channelId: this._channelId, enabled: this._insertDelay },
    }));
  }

  private _handleReverbClick() {
    this._insertReverb = !this._insertReverb;
    this._updateReverbBtn();
    this.dispatchEvent(new CustomEvent("insert-reverb-change", {
      detail: { channelId: this._channelId, enabled: this._insertReverb },
    }));
  }
}

if (!customElements.get("daw-mixer-channel")) {
  customElements.define("daw-mixer-channel", MixerChannel);
}