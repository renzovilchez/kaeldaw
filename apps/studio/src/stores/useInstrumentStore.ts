import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import type { OscillatorType, SynthVoiceConfig } from "@kaeldaw/instruments/PolySynth";

export interface InstrumentPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  config: Partial<{
    oscillatorType: OscillatorType;
    filterCutoff: number;
    filterResonance: number;
    ampEnvAttack: number;
    ampEnvDecay: number;
    ampEnvSustain: number;
    ampEnvRelease: number;
    volume: number;
  }>;
}

const DEFAULT_PRESETS: InstrumentPreset[] = [
  { id: "poly-saw", name: "Saw Lead", category: "Synths", icon: "🎛", config: { oscillatorType: "saw", filterCutoff: 12000, filterResonance: 0.1, ampEnvAttack: 0.01, ampEnvDecay: 0.1, ampEnvSustain: 0.7, ampEnvRelease: 0.3, volume: 0.5 } },
  { id: "poly-sine", name: "Sine Pad", category: "Synths", icon: "🎛", config: { oscillatorType: "sine", filterCutoff: 8000, filterResonance: 0, ampEnvAttack: 0.05, ampEnvDecay: 0.2, ampEnvSustain: 0.8, ampEnvRelease: 0.5, volume: 0.4 } },
  { id: "poly-square", name: "Square Wave", category: "Synths", icon: "🎛", config: { oscillatorType: "square", filterCutoff: 6000, filterResonance: 0.2, ampEnvAttack: 0.01, ampEnvDecay: 0.05, ampEnvSustain: 0.5, ampEnvRelease: 0.2, volume: 0.4 } },
  { id: "poly-bass", name: "Bass Sub", category: "Synths", icon: "🎛", config: { oscillatorType: "saw", filterCutoff: 4000, filterResonance: 0.3, ampEnvAttack: 0.02, ampEnvDecay: 0.15, ampEnvSustain: 0.9, ampEnvRelease: 0.1, volume: 0.6 } },
  { id: "poly-pluck", name: "Pluck", category: "Synths", icon: "🎛", config: { oscillatorType: "square", filterCutoff: 10000, filterResonance: 0.05, ampEnvAttack: 0.001, ampEnvDecay: 0.3, ampEnvSustain: 0, ampEnvRelease: 0.05, volume: 0.5 } },
];

type Listener = () => void;

class InstrumentManager {
  private _selectedId = "poly-saw";
  private _collapsed: Record<string, boolean> = {};
  private _listeners = new Set<Listener>();

  get presets(): InstrumentPreset[] { return DEFAULT_PRESETS; }
  get selectedId(): string { return this._selectedId; }
  get collapsed(): Record<string, boolean> { return this._collapsed; }

  selectPreset(id: string) {
    const preset = DEFAULT_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    this._selectedId = id;
    const synth = PolySynthOutput.synthInstance;
    if (synth) synth.setConfig(preset.config);
    this._notify();
  }

  getSelectedConfig(): Partial<SynthVoiceConfig> {
    const preset = DEFAULT_PRESETS.find((p) => p.id === this._selectedId);
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
