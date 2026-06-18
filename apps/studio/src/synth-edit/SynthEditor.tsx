import { useState, useRef, useEffect, createElement, useCallback } from "react";
import { useSyncExternalStore } from "react";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";
import { instrumentManager } from "../stores/useInstrumentStore";
import { Knob } from "../shared/Knob";

const OSC_TYPES = ["sine", "saw", "square", "triangle", "noise", "fm", "pluck"];
const LFO_TARGETS = ["none", "pitch", "filter", "volume"];

const CATEGORY_ORDER = ["Synths", "Keys", "Winds", "Bass", "Strings", "Drums", "FX", "Custom"];

function pickerKnob(value: number, min: number, max: number, step: number, label: string, onChange: (v: number) => void) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Knob value={value} min={min} max={max} size={32} label={label} onChange={onChange} />
      <input
        className="w-12 text-center text-[9px] bg-[#2a2a2a] border border-[#555] rounded text-[#ccc] outline-none"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        step={step}
        type="number"
      />
    </div>
  );
}

function adsrSlider(value: number, min: number, max: number, step: number, label: string, onChange: (v: number) => void) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-6 text-right text-[#999]">{label}</span>
      <input
        className="flex-1 h-1 accent-[#3b82f6]"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="w-9 text-left text-[#aaa]">{value.toFixed(3)}</span>
    </div>
  );
}

function sectionToggle(open: boolean, label: string, onToggle: () => void) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 cursor-pointer text-[10px] text-[#999] uppercase tracking-wider hover:text-[#ccc] bg-[#2a2a2a] rounded"
      onClick={onToggle}
    >
      <span className="text-[9px]">{open ? "\u25BC" : "\u25B6"}</span>
      {label}
    </div>
  );
}

export function SynthEditor() {
  const presets = instrumentManager.presets;
  const snapshotKey = useSyncExternalStore(
    instrumentManager.subscribe.bind(instrumentManager),
    () => instrumentManager.selectedId + ":" + instrumentManager.version,
  );
  const selectedId = snapshotKey.split(":")[0];
  const config = instrumentManager.getSelectedConfig() as Record<string, any>;
  const [saveName, setSaveName] = useState("");
  const [lfoOpen, setLfoOpen] = useState(false);
  const [fmOpen, setFmOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [pluckOpen, setPluckOpen] = useState(false);

  const update = useCallback((key: string, value: unknown) => {
    instrumentManager.updateConfig({ [key]: value });
  }, []);

  const categories = [...new Set(presets.map((p) => p.category))].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
  );

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) return;
    instrumentManager.saveCustomPreset(name);
    setSaveName("");
  };

  // Waveform element
  const waveformRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const el = waveformRef.current as any;
      if (el) {
        const samples = PolySynthOutput.getWaveformSamples();
        if (samples) el.samples = samples;
      }
      setTimeout(tick, 80);
    };
    tick();
    return () => { cancelled = true; };
  }, []);

  // Mini keyboard
  const previewStartedRef = useRef(false);
  const activeKeyRef = useRef<number | null>(null);

  const keyNoteOn = useCallback(async (note: number) => {
    try {
      if (!previewStartedRef.current) {
        AudioContextManager.init();
        await PolySynthOutput.start();
        PolySynthOutput.setConfig(config);
        previewStartedRef.current = true;
      }
      PolySynthOutput.noteOn(note, 100);
      activeKeyRef.current = note;
    } catch (err) {
      console.error("Preview failed:", err);
    }
  }, [config]);

  const keyNoteOff = useCallback((note: number) => {
    PolySynthOutput.noteOff(note);
    if (activeKeyRef.current === note) activeKeyRef.current = null;
  }, []);

  const WHITE_KEYS = [
    { note: 60, name: "C" },
    { note: 62, name: "D" },
    { note: 64, name: "E" },
    { note: 65, name: "F" },
    { note: 67, name: "G" },
    { note: 69, name: "A" },
    { note: 71, name: "B" },
  ];
  const BLACK_KEYS = [
    { note: 61, name: "C#" },
    { note: 63, name: "D#" },
    { note: 66, name: "F#" },
    { note: 68, name: "G#" },
    { note: 70, name: "A#" },
  ];

  const oscType = config.oscillatorType || "saw";

  return (
    <div className="flex flex-col h-full bg-[#2d2d2d] text-[11px] text-[#ccc] select-none overflow-y-auto">
      {/* Preset bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#252525] border-b border-[#444] shrink-0">
        <button className="px-1.5 py-0.5 text-[10px] bg-[#3a3a3a] rounded hover:bg-[#555] text-[#ccc]" onClick={() => instrumentManager.prevPreset()} title="Previous preset">{"\u25C0"}</button>
        <select
          className="flex-1 bg-[#3a3a3a] border border-[#555] rounded px-1 py-0.5 text-[10px] text-[#ccc] outline-none cursor-pointer"
          value={selectedId}
          onChange={(e) => instrumentManager.selectPreset(e.target.value)}
        >
          {categories.map((cat) => (
            <optgroup key={cat} label={cat}>
              {presets.filter((p) => p.category === cat).map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button className="px-1.5 py-0.5 text-[10px] bg-[#3a3a3a] rounded hover:bg-[#555] text-[#ccc]" onClick={() => instrumentManager.nextPreset()} title="Next preset">{"\u25B6"}</button>
      </div>

      {/* Oscillator type */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-[#444]">
        <span className="text-[10px] text-[#999] w-12">Osc Type</span>
        <select
          className="flex-1 bg-[#3a3a3a] border border-[#555] rounded px-1 py-0.5 text-[10px] text-[#ccc] outline-none"
          value={oscType}
          onChange={(e) => update("oscillatorType", e.target.value)}
        >
          {OSC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Knobs row */}
      <div className="flex items-start justify-around px-2 py-1 border-b border-[#444]">
        {pickerKnob(config.oscillatorDetune ?? 0, -100, 100, 1, "Detune", (v) => update("oscillatorDetune", v))}
        {pickerKnob(config.filterCutoff ?? 8000, 20, 20000, 10, "Cutoff", (v) => update("filterCutoff", v))}
        {pickerKnob(config.filterResonance ?? 0, 0, 1, 0.01, "Resonance", (v) => update("filterResonance", v))}
        {pickerKnob(config.volume ?? 0.5, 0, 1, 0.01, "Volume", (v) => update("volume", v))}
      </div>

      {/* ADSR */}
      <div className="px-2 py-1 border-b border-[#444] space-y-0.5">
        {adsrSlider(config.ampEnvAttack ?? 0.01, 0.001, 5, 0.001, "A", (v) => update("ampEnvAttack", v))}
        {adsrSlider(config.ampEnvDecay ?? 0.1, 0.001, 5, 0.001, "D", (v) => update("ampEnvDecay", v))}
        {adsrSlider(config.ampEnvSustain ?? 0.7, 0, 1, 0.01, "S", (v) => update("ampEnvSustain", v))}
        {adsrSlider(config.ampEnvRelease ?? 0.3, 0.001, 5, 0.001, "R", (v) => update("ampEnvRelease", v))}
      </div>

      {/* Collapsible sections */}
      <div className="px-2 py-1 space-y-1">
        {sectionToggle(lfoOpen, "LFO", () => setLfoOpen(!lfoOpen))}
        {lfoOpen && (
          <div className="pl-3 space-y-1 border-l border-[#444] ml-1">
            {pickerKnob(config.lfoRate ?? 0, 0, 20, 0.1, "Rate", (v) => update("lfoRate", v))}
            {pickerKnob(config.lfoDepth ?? 0, 0, 1, 0.01, "Depth", (v) => update("lfoDepth", v))}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[#999]">Target</span>
              <select
                className="flex-1 bg-[#3a3a3a] border border-[#555] rounded px-1 py-0.5 text-[10px] text-[#ccc] outline-none"
                value={config.lfoTarget || "none"}
                onChange={(e) => update("lfoTarget", e.target.value)}
              >
                {LFO_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        )}

        {oscType === "fm" && sectionToggle(fmOpen, "FM", () => setFmOpen(!fmOpen))}
        {fmOpen && oscType === "fm" && (
          <div className="pl-3 space-y-1 border-l border-[#444] ml-1">
            {pickerKnob(config.fmModRatio ?? 1, 0.5, 8, 0.01, "Ratio", (v) => update("fmModRatio", v))}
            {pickerKnob(config.fmModLevel ?? 0, 0, 3, 0.01, "Level", (v) => update("fmModLevel", v))}
            {pickerKnob(config.fmCarRatio ?? 1, 0.5, 2, 0.01, "Carrier", (v) => update("fmCarRatio", v))}
          </div>
        )}

        {sectionToggle(pitchOpen, "Pitch Env", () => setPitchOpen(!pitchOpen))}
        {pitchOpen && (
          <div className="pl-3 space-y-1 border-l border-[#444] ml-1">
            {pickerKnob(config.pitchEnvAmount ?? 0, -48, 48, 1, "Amount", (v) => update("pitchEnvAmount", v))}
            {adsrSlider(config.pitchEnvAttack ?? 0, 0, 5, 0.001, "Time", (v) => update("pitchEnvAttack", v))}
          </div>
        )}

        {oscType === "pluck" && sectionToggle(pluckOpen, "Pluck", () => setPluckOpen(!pluckOpen))}
        {pluckOpen && oscType === "pluck" && (
          <div className="pl-3 space-y-1 border-l border-[#444] ml-1">
            {pickerKnob(config.pluckDamping ?? 0.5, 0, 1, 0.01, "Damp", (v) => update("pluckDamping", v))}
          </div>
        )}
      </div>

      {/* Save as */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-[#444] mt-auto shrink-0">
        <input
          className="flex-1 bg-[#3a3a3a] border border-[#555] rounded px-1 py-0.5 text-[10px] text-[#ccc] outline-none placeholder-[#666]"
          placeholder="Save as..."
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <button
          className="px-2 py-0.5 text-[10px] bg-[#3b82f6] rounded hover:bg-[#2563eb] text-white disabled:opacity-40"
          disabled={!saveName.trim()}
          onClick={handleSave}
        >Save</button>
      </div>

      {/* Mini keyboard */}
      <div className="flex justify-center px-2 py-1 bg-[#1a1a2e] border-t border-[#444] shrink-0">
        <div className="relative flex" style={{ width: 28 * 7 }}>
          {WHITE_KEYS.map((k) => (
            <div
              key={k.note}
              className="flex items-end justify-center pb-0.5 cursor-pointer border-r border-[#555] bg-[#e0e0e0] hover:bg-[#ccc] active:bg-[#aaa] text-[8px] text-[#444]"
              style={{ width: 28, height: 40 }}
              onMouseDown={() => keyNoteOn(k.note)}
              onMouseUp={() => keyNoteOff(k.note)}
              onMouseLeave={() => { if (activeKeyRef.current === k.note) keyNoteOff(k.note); }}
            >
              {k.name}
            </div>
          ))}
          {BLACK_KEYS.map((k, i) => (
            <div
              key={k.note}
              className="absolute cursor-pointer bg-[#222] hover:bg-[#444] active:bg-[#555] text-[7px] text-[#999] flex items-center justify-center pb-0.5"
              style={{
                width: 18,
                height: 24,
                left: 28 * (i < 2 ? i + 1 : i + 2) - 9,
                top: 0,
                zIndex: 1,
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
              }}
              onMouseDown={() => keyNoteOn(k.note)}
              onMouseUp={() => keyNoteOff(k.note)}
              onMouseLeave={() => { if (activeKeyRef.current === k.note) keyNoteOff(k.note); }}
            >
              {k.name}
            </div>
          ))}
        </div>
      </div>

      {/* Waveform */}
      <div className="h-12 bg-[#1a1a2e] border-t border-[#444] shrink-0">
        {createElement("daw-waveform", {
          ref: waveformRef,
          style: { width: "100%", height: "100%", display: "block" },
        })}
      </div>
    </div>
  );
}
