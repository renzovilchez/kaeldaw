import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";

interface InstrumentPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  config: Record<string, unknown>;
}

const DEFAULT_PRESETS: InstrumentPreset[] = [
  { id: "poly-saw", name: "Saw Lead", category: "Synths", icon: "🎛", config: { oscillatorType: "saw", filterCutoff: 12000, filterResonance: 0.1, ampEnvAttack: 0.01, ampEnvDecay: 0.1, ampEnvSustain: 0.7, ampEnvRelease: 0.15, volume: 0.4, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-sine", name: "Sine Pad", category: "Synths", icon: "🎛", config: { oscillatorType: "sine", filterCutoff: 8000, filterResonance: 0, ampEnvAttack: 0.05, ampEnvDecay: 0.2, ampEnvSustain: 0.6, ampEnvRelease: 0.15, volume: 0.35, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-square", name: "Square Wave", category: "Synths", icon: "🎛", config: { oscillatorType: "square", filterCutoff: 6000, filterResonance: 0.2, ampEnvAttack: 0.01, ampEnvDecay: 0.05, ampEnvSustain: 0.4, ampEnvRelease: 0.15, volume: 0.3, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-bass", name: "Bass Sub", category: "Synths", icon: "🎛", config: { oscillatorType: "saw", filterCutoff: 4000, filterResonance: 0.3, ampEnvAttack: 0.02, ampEnvDecay: 0.15, ampEnvSustain: 0.9, ampEnvRelease: 0.1, volume: 0.6, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-pluck", name: "Pluck", category: "Synths", icon: "🎛", config: { oscillatorType: "square", filterCutoff: 10000, filterResonance: 0.05, ampEnvAttack: 0.001, ampEnvDecay: 0.3, ampEnvSustain: 0, ampEnvRelease: 0.05, volume: 0.5, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-organ", name: "Organ", category: "Keys", icon: "🎹", config: { oscillatorType: "square", filterCutoff: 8000, filterResonance: 0.1, ampEnvAttack: 0.001, ampEnvDecay: 0.05, ampEnvSustain: 1, ampEnvRelease: 0.05, volume: 0.4, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-brass", name: "Synth Brass", category: "Synths", icon: "🎛", config: { oscillatorType: "saw", filterCutoff: 6000, filterResonance: 0.3, ampEnvAttack: 0.03, ampEnvDecay: 0.1, ampEnvSustain: 0.8, ampEnvRelease: 0.1, volume: 0.45, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-softpad", name: "Soft Pad", category: "Synths", icon: "🎛", config: { oscillatorType: "triangle", filterCutoff: 4000, filterResonance: 0, ampEnvAttack: 0.2, ampEnvDecay: 0.3, ampEnvSustain: 0.6, ampEnvRelease: 0.5, volume: 0.3, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-bell", name: "Synth Bell", category: "Keys", icon: "🔔", config: { oscillatorType: "square", filterCutoff: 14000, filterResonance: 0.05, ampEnvAttack: 0.001, ampEnvDecay: 0.8, ampEnvSustain: 0, ampEnvRelease: 0.4, volume: 0.35, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-flute", name: "Flute", category: "Winds", icon: "🎵", config: { oscillatorType: "triangle", filterCutoff: 6000, filterResonance: 0.05, ampEnvAttack: 0.05, ampEnvDecay: 0.1, ampEnvSustain: 0.7, ampEnvRelease: 0.2, volume: 0.35, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-kick", name: "Kick Drum", category: "Drums", icon: "🥁", config: { oscillatorType: "sine", filterCutoff: 4000, filterResonance: 0.1, ampEnvAttack: 0.001, ampEnvDecay: 0.15, ampEnvSustain: 0, ampEnvRelease: 0.05, volume: 0.7, pitchEnvAmount: -36, pitchEnvAttack: 0.05 } },
  { id: "poly-snare", name: "Snare", category: "Drums", icon: "🥁", config: { oscillatorType: "noise", filterCutoff: 8000, filterResonance: 0.3, ampEnvAttack: 0.001, ampEnvDecay: 0.08, ampEnvSustain: 0, ampEnvRelease: 0.05, volume: 0.5, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-hat", name: "Hi-Hat", category: "Drums", icon: "🥁", config: { oscillatorType: "noise", filterCutoff: 14000, filterResonance: 0.1, ampEnvAttack: 0.001, ampEnvDecay: 0.03, ampEnvSustain: 0, ampEnvRelease: 0.02, volume: 0.3, pitchEnvAmount: 0, pitchEnvAttack: 0 } },
  { id: "poly-riser", name: "Riser FX", category: "FX", icon: "💥", config: { oscillatorType: "saw", filterCutoff: 2000, filterResonance: 0.5, ampEnvAttack: 0.5, ampEnvDecay: 0, ampEnvSustain: 0.8, ampEnvRelease: 0.5, volume: 0.4, pitchEnvAmount: 24, pitchEnvAttack: 1, lfoRate: 0, lfoDepth: 0, lfoTarget: "none", fmModRatio: 1, fmModLevel: 0, fmCarRatio: 1, pluckDamping: 0.5 } },
  { id: "poly-flute-vib", name: "Flute Vibrato", category: "Winds", icon: "🎵", config: { oscillatorType: "triangle", filterCutoff: 6000, filterResonance: 0.05, ampEnvAttack: 0.05, ampEnvDecay: 0.1, ampEnvSustain: 0.7, ampEnvRelease: 0.2, volume: 0.35, pitchEnvAmount: 0, pitchEnvAttack: 0, lfoRate: 5, lfoDepth: 0.4, lfoTarget: "pitch", fmModRatio: 1, fmModLevel: 0, fmCarRatio: 1, pluckDamping: 0.5 } },
  { id: "poly-wah", name: "Wah Guitar", category: "Synths", icon: "🎛", config: { oscillatorType: "saw", filterCutoff: 4000, filterResonance: 0.7, ampEnvAttack: 0.01, ampEnvDecay: 0.1, ampEnvSustain: 0.6, ampEnvRelease: 0.1, volume: 0.4, pitchEnvAmount: 0, pitchEnvAttack: 0, lfoRate: 2, lfoDepth: 0.6, lfoTarget: "filter", fmModRatio: 1, fmModLevel: 0, fmCarRatio: 1, pluckDamping: 0.5 } },
  { id: "poly-tremolo", name: "Tremolo Pad", category: "Synths", icon: "🎛", config: { oscillatorType: "sine", filterCutoff: 8000, filterResonance: 0, ampEnvAttack: 0.1, ampEnvDecay: 0.2, ampEnvSustain: 0.6, ampEnvRelease: 0.3, volume: 0.35, pitchEnvAmount: 0, pitchEnvAttack: 0, lfoRate: 4, lfoDepth: 0.5, lfoTarget: "volume", fmModRatio: 1, fmModLevel: 0, fmCarRatio: 1, pluckDamping: 0.5 } },
  { id: "poly-epiano", name: "E. Piano", category: "Keys", icon: "🎹", config: { oscillatorType: "fm", filterCutoff: 12000, filterResonance: 0.1, ampEnvAttack: 0.001, ampEnvDecay: 0.5, ampEnvSustain: 0.3, ampEnvRelease: 0.2, volume: 0.4, pitchEnvAmount: 0, pitchEnvAttack: 0, lfoRate: 0, lfoDepth: 0, lfoTarget: "none", fmModRatio: 2, fmModLevel: 1, fmCarRatio: 1, pluckDamping: 0.5 } },
  { id: "poly-fmbell", name: "FM Bell", category: "Keys", icon: "🔔", config: { oscillatorType: "fm", filterCutoff: 18000, filterResonance: 0, ampEnvAttack: 0.001, ampEnvDecay: 0.8, ampEnvSustain: 0, ampEnvRelease: 0.5, volume: 0.35, pitchEnvAmount: 0, pitchEnvAttack: 0, lfoRate: 0, lfoDepth: 0, lfoTarget: "none", fmModRatio: 4.76, fmModLevel: 2, fmCarRatio: 1, pluckDamping: 0.5 } },
  { id: "poly-fmbass", name: "FM Bass", category: "Bass", icon: "🎸", config: { oscillatorType: "fm", filterCutoff: 6000, filterResonance: 0.2, ampEnvAttack: 0.01, ampEnvDecay: 0.1, ampEnvSustain: 0.8, ampEnvRelease: 0.1, volume: 0.5, pitchEnvAmount: 0, pitchEnvAttack: 0, lfoRate: 0, lfoDepth: 0, lfoTarget: "none", fmModRatio: 0.5, fmModLevel: 1.5, fmCarRatio: 1, pluckDamping: 0.5 } },
  { id: "poly-guitar", name: "Ac. Guitar", category: "Strings", icon: "🎸", config: { oscillatorType: "pluck", filterCutoff: 10000, filterResonance: 0.05, ampEnvAttack: 0.001, ampEnvDecay: 0.3, ampEnvSustain: 0, ampEnvRelease: 0.1, volume: 0.45, pitchEnvAmount: 0, pitchEnvAttack: 0, lfoRate: 0, lfoDepth: 0, lfoTarget: "none", fmModRatio: 1, fmModLevel: 0, fmCarRatio: 1, pluckDamping: 0.3 } },
  { id: "poly-harpsi", name: "Harpsichord", category: "Keys", icon: "🎹", config: { oscillatorType: "pluck", filterCutoff: 14000, filterResonance: 0, ampEnvAttack: 0.001, ampEnvDecay: 0.6, ampEnvSustain: 0, ampEnvRelease: 0.05, volume: 0.4, pitchEnvAmount: 0, pitchEnvAttack: 0, lfoRate: 0, lfoDepth: 0, lfoTarget: "none", fmModRatio: 1, fmModLevel: 0, fmCarRatio: 1, pluckDamping: 0.1 } },
];

const CUSTOM_PRESETS_KEY = "kaeldaw-custom-presets";

function loadCustomPresets(): InstrumentPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomPresets(presets: InstrumentPreset[]): void {
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
}

type Listener = () => void;

class InstrumentManager {
  private _selectedId = "poly-saw";
  private _collapsed: Record<string, boolean> = {};
  private _listeners = new Set<Listener>();
  private _customPresets: InstrumentPreset[] = loadCustomPresets();
  private _version = 0;

  get presets(): InstrumentPreset[] { return [...DEFAULT_PRESETS, ...this._customPresets]; }
  get selectedId(): string { return this._selectedId; }
  get collapsed(): Record<string, boolean> { return this._collapsed; }
  get version(): number { return this._version; }

  selectPreset(id: string) {
    const preset = this.presets.find((p) => p.id === id);
    if (!preset) return;
    this._selectedId = id;
    PolySynthOutput.setConfig(preset.config);
    this._notify();
  }

  nextPreset() {
    const list = this.presets;
    const idx = list.findIndex((p) => p.id === this._selectedId);
    if (idx < list.length - 1) this.selectPreset(list[idx + 1].id);
  }

  prevPreset() {
    const list = this.presets;
    const idx = list.findIndex((p) => p.id === this._selectedId);
    if (idx > 0) this.selectPreset(list[idx - 1].id);
  }

  updateConfig(changes: Record<string, unknown>) {
    PolySynthOutput.setConfig(changes);
    this._version++;
    this._notify();
  }

  saveCustomPreset(name: string) {
    const preset = this.presets.find((p) => p.id === this._selectedId);
    if (!preset) return;
    const id = `custom-${Date.now()}`;
    const newPreset: InstrumentPreset = {
      id,
      name,
      category: "Custom",
      icon: "⭐",
      config: { ...preset.config },
    };
    this._customPresets.push(newPreset);
    saveCustomPresets(this._customPresets);
    this._selectedId = id;
    PolySynthOutput.setConfig(newPreset.config);
    this._notify();
  }

  getSelectedConfig(): Record<string, unknown> {
    const preset = this.presets.find((p) => p.id === this._selectedId);
    return preset?.config ?? {};
  }

  toggleCategory(category: string) {
    this._collapsed = { ...this._collapsed, [category]: !this._collapsed[category] };
    this._notify();
  }

  subscribe(fn: Listener): () => void {
    this._listeners.add(fn);
    return () => { this._listeners.delete(fn); };
  }

  private _notify() {
    this._listeners.forEach((fn) => fn());
  }
}

export const instrumentManager = new InstrumentManager();
