import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { SampleCache } from "@kaeldaw/instruments/SampleCache";

export interface InstrumentPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  engine: "synth" | "sampler";
  config: Record<string, unknown>;
  sampleId?: string;
  rootNote?: number;
}

const DEFAULT_PRESETS: InstrumentPreset[] = [
  {
    id: "poly-saw",
    name: "Saw Lead",
    category: "Synths",
    icon: "🎛",
    engine: "synth",
    config: {
      oscillatorType: "saw",
      filterCutoff: 8000,
      filterResonance: 0.1,
      ampEnvAttack: 0.01,
      ampEnvDecay: 0.1,
      ampEnvSustain: 0.7,
      ampEnvRelease: 0.15,
      volume: 0.5,
    },
  },
  {
    id: "poly-sine",
    name: "Sine Pad",
    category: "Synths",
    icon: "🎛",
    engine: "synth",
    config: {
      oscillatorType: "sine",
      filterCutoff: 6000,
      filterResonance: 0.2,
      ampEnvAttack: 0.05,
      ampEnvDecay: 0.3,
      ampEnvSustain: 0.8,
      ampEnvRelease: 0.5,
      volume: 0.5,
    },
  },
  {
    id: "poly-square",
    name: "Square Wave",
    category: "Synths",
    icon: "🎛",
    engine: "synth",
    config: {
      oscillatorType: "square",
      filterCutoff: 5000,
      filterResonance: 0.3,
      ampEnvAttack: 0.01,
      ampEnvDecay: 0.05,
      ampEnvSustain: 0.5,
      ampEnvRelease: 0.1,
      volume: 0.4,
    },
  },
  {
    id: "fm-bell",
    name: "FM Bell",
    category: "Synths",
    icon: "🎛",
    engine: "synth",
    config: {
      oscillatorType: "fm",
      fmModRatio: 4.76,
      fmModLevel: 0.8,
      fmCarRatio: 1,
      ampEnvAttack: 0.001,
      ampEnvDecay: 0.5,
      ampEnvSustain: 0,
      ampEnvRelease: 0.8,
      volume: 0.4,
    },
  },
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

class InstrumentManager {
  private _presets: InstrumentPreset[] = [];
  private _selectedId = "";
  private _version = 0;
  private _listeners: Set<() => void> = new Set();
  private _isModified = false;

  constructor() {
    this._presets = [...DEFAULT_PRESETS, ...loadCustomPresets()];
    this._selectedId = "poly-saw";
  }

  get presets(): InstrumentPreset[] {
    return this._presets;
  }
  get selectedId(): string {
    return this._selectedId;
  }
  get selectedPreset(): InstrumentPreset | undefined {
    return this._presets.find((p) => p.id === this._selectedId);
  }
  get isModified(): boolean {
    return this._isModified;
  }

  selectPreset(id: string): void {
    const preset = this._presets.find((p) => p.id === id);
    if (!preset) return;
    this._selectedId = id;
    this._isModified = false;
    if (preset.engine === "sampler") {
      const sampleData = preset.sampleId
        ? SampleCache.get(preset.sampleId)
        : undefined;
      if (sampleData) {
        PolySynthOutput.loadSample(preset.sampleId!, sampleData, 44100);
      }
    }
    PolySynthOutput.setConfig({
      ...preset.config,
      engine: preset.engine,
      rootNote: preset.rootNote ?? 60,
    } as Record<string, unknown>);
    this._version++;
    this._notify();
  }

  setEngine(channelId: string, _engine: "synth" | "sampler"): void {
    PolySynthOutput.setChannelVolume(channelId, 1, 0, false);
    PolySynthOutput.setConfig(this.getSelectedConfig());
  }

  getSelectedConfig(): Record<string, unknown> {
    const preset = this.selectedPreset;
    return preset ? { ...preset.config, engine: preset.engine } : {};
  }

  updateConfig(changes: Record<string, unknown>): void {
    PolySynthOutput.setConfig({
      ...this.getSelectedConfig(),
      ...changes,
    });
    this._isModified = true;
    this._version++;
    this._notify();
  }

  saveCustomPreset(
    name: string,
    engine: "synth" | "sampler" = "synth",
    sampleId?: string,
  ): void {
    const preset: InstrumentPreset = {
      id: `custom-${Date.now()}`,
      name,
      category: "Custom",
      icon: "🎛",
      engine,
      config: this.getSelectedConfig(),
      sampleId,
    };
    this._presets.push(preset);
    this._selectedId = preset.id;
    this._isModified = false;
    this._version++;
    this._notify();
    saveCustomPresets(this._presets.filter((p) => p.id.startsWith("custom-")));
  }

  get version(): number {
    return this._version;
  }

  subscribe = (fn: () => void): (() => void) => {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  };

  private _notify(): void {
    for (const fn of this._listeners) fn();
  }
}

export const instrumentManager = new InstrumentManager();
