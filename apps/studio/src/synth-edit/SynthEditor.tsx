import { useRef, useCallback, useState } from "react";
import { useSyncExternalStore } from "react";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";
import { instrumentManager } from "../shared/instrumentManager";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEYS = [1, 3, 6, 8, 10];

function SynthEditorInner() {
  const preset = instrumentManager.selectedPreset;
  const previewStartedRef = useRef(false);
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(
    () => ({
      ...preset?.config,
      engine: preset?.engine ?? "synth",
      sampleId: preset?.sampleId,
    }),
  );
  const [sampleFile, setSampleFile] = useState(preset?.sampleId ?? "");
  const [sampleDuration, setSampleDuration] = useState("");
  const [isModified, setIsModified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState("");

  const isSampler = preset?.engine === "sampler";
  const isAlreadySaved = !isModified && preset?.id.startsWith("custom-");

  const updateConfig = useCallback((changes: Record<string, unknown>) => {
    setLocalConfig((prev) => ({ ...prev, ...changes }));
    setIsModified(true);
    instrumentManager.updateConfig(changes);
  }, []);

  const keyNoteOn = useCallback(
    async (note: number) => {
      if (!previewStartedRef.current) {
        AudioContextManager.init();
        await PolySynthOutput.start();
        PolySynthOutput.setConfig(instrumentManager.getSelectedConfig());
        previewStartedRef.current = true;
      }
      PolySynthOutput.noteOn(note, 100, "", preset?.engine ?? "synth");
    },
    [preset],
  );

  const keyNoteOff = useCallback((note: number) => {
    PolySynthOutput.noteOff(note);
  }, []);

  const handleLoadSample = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/wav,audio/ogg,audio/mp3";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const { SampleCache } =
          await import("@kaeldaw/instruments/SampleCache");
        const sampleId = await SampleCache.loadFromFile(file);
        setSampleFile(file.name);
        const meta = SampleCache.getMeta(sampleId);
        if (meta)
          setSampleDuration(
            `${meta.duration.toFixed(2)}s (${Math.round(meta.duration * meta.sampleRate)} samples @ ${meta.sampleRate}Hz)`,
          );
        const data = SampleCache.get(sampleId);
        if (data)
          PolySynthOutput.loadSample(sampleId, data, meta?.sampleRate ?? 44100);
        setLocalConfig((prev) => ({ ...prev, sampleId }));
      } catch (err) {
        console.error("Failed to load sample:", err);
      }
    };
    input.click();
  }, []);

  const startSave = useCallback(() => {
    setSaveName("Custom");
    setSaveError("");
    setSaving(true);
  }, []);

  const confirmSave = useCallback(() => {
    const ok = instrumentManager.saveCustomPreset(
      saveName,
      isSampler ? "sampler" : "synth",
      localConfig.sampleId as string,
    );
    if (ok) {
      setSaving(false);
      setSaveError("");
    } else {
      setSaveError("Ya existe un preset con ese nombre");
    }
  }, [saveName, isSampler, localConfig]);

  const octaveOffset = 4;

  function renderPianoKey(noteIndex: number, isBlack: boolean, label: string) {
    const midiNote = octaveOffset * 12 + noteIndex;
    const style: React.CSSProperties = isBlack
      ? {
          position: "absolute",
          left: `${(noteIndex / 12) * 100}%`,
          width: "7%",
          height: "60%",
          top: 0,
          zIndex: 1,
          background: "#222",
          borderRadius: "0 0 3px 3px",
          cursor: "pointer",
          border: "1px solid #444",
        }
      : {
          width: `${100 / 7}%`,
          height: "100%",
          background: "#ddd",
          border: "1px solid #aaa",
          borderRadius: "0 0 4px 4px",
          cursor: "pointer",
          color: "#333",
          fontSize: "8px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: "2px",
        };
    return (
      <div
        key={midiNote}
        style={style}
        onMouseDown={(e) => {
          e.preventDefault();
          keyNoteOn(midiNote);
        }}
        onMouseUp={() => keyNoteOff(midiNote)}
        onMouseLeave={() => keyNoteOff(midiNote)}
        title={label}
      >
        {!isBlack && <span>{label.replace(/^\d+/, "")}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-[11px] text-[#ccc] overflow-y-auto">
      <div className="h-7 border-b border-[#4a4a4a] flex items-center px-3 text-[10px] text-[#888] uppercase tracking-wider shrink-0">
        {isSampler ? "Sampler Editor" : "Synth Editor"}
      </div>

      <div className="flex items-center gap-2 p-2 border-b border-[#4a4a4a] shrink-0">
        <select
          className="flex-1 bg-[#3a3a3a] border border-[#555] rounded px-2 py-1 text-[11px] text-[#ccc]"
          value={isModified ? "__custom__" : (preset?.id ?? "")}
          onChange={(e) => {
            if (e.target.value !== "__custom__") {
              instrumentManager.selectPreset(e.target.value);
            }
          }}
        >
          <option value="__custom__" disabled={!isModified} className={isModified ? "text-[#fbbf24]" : ""}>
            {isModified ? "🔄 Custom" : "Custom"}
          </option>
          {(() => {
            const groups: Record<string, typeof instrumentManager.presets> = {};
            for (const p of instrumentManager.presets) {
              if (!groups[p.category]) groups[p.category] = [];
              groups[p.category].push(p);
            }
            return Object.entries(groups).map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </optgroup>
            ));
          })()}
        </select>
        {saving ? (
          <div className="flex items-center gap-1">
            <input
              className="bg-[#3a3a3a] border border-[#555] rounded px-2 py-1 text-[11px] text-[#ccc] w-28"
              value={saveName}
              onChange={(e) => {
                setSaveName(e.target.value);
                setSaveError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmSave();
                if (e.key === "Escape") {
                  setSaving(false);
                  setSaveError("");
                }
              }}
              autoFocus
            />
            <button
              className="px-2 py-1 rounded bg-[#3b82f6] text-white text-[10px] hover:bg-[#2563eb]"
              onClick={confirmSave}
            >
              OK
            </button>
            <button
              className="px-2 py-1 rounded bg-[#4a4a4a] text-[#ccc] text-[10px] hover:bg-[#555]"
              onClick={() => {
                setSaving(false);
                setSaveError("");
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            className={`px-2 py-1 rounded text-[10px] transition-colors ${
              isAlreadySaved
                ? "bg-[#3a3a3a] text-[#666] cursor-not-allowed"
                : "bg-[#4a4a4a] text-[#ccc] hover:bg-[#555]"
            }`}
            disabled={isAlreadySaved}
            onClick={startSave}
          >
            Save
          </button>
        )}
        {saveError && (
          <span className="text-[10px] text-[#f87171]">{saveError}</span>
        )}
      </div>

      {isSampler && (
        <div className="p-2 space-y-3 border-b border-[#4a4a4a] shrink-0">
          <button
            className="w-full py-2 rounded bg-[#3b82f6] text-white text-[11px] font-medium hover:bg-[#2563eb] transition-colors"
            onClick={handleLoadSample}
          >
            Load WAV / Audio File
          </button>
          {sampleFile && (
            <div className="text-[10px] text-[#999] space-y-0.5">
              <div>
                <span className="text-[#888]">File:</span> {sampleFile}
              </div>
              {sampleDuration && (
                <div>
                  <span className="text-[#888]">Info:</span> {sampleDuration}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="text-[10px] text-[#888] block mb-1">
              Root Note
            </label>
            <select
              className="w-full bg-[#3a3a3a] border border-[#555] rounded px-2 py-1 text-[11px]"
              value={(localConfig.rootNote as number) ?? 60}
              onChange={(e) =>
                updateConfig({ rootNote: Number(e.target.value) })
              }
            >
              {Array.from({ length: 61 }, (_, i) => i + 24).map((note) => {
                const oct = Math.floor(note / 12) - 1;
                const name = NOTES[note % 12];
                return (
                  <option key={note} value={note}>
                    {name}
                    {oct} ({note})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {!isSampler && (
        <div className="p-2 space-y-3 border-b border-[#4a4a4a] shrink-0">
          <div>
            <label className="text-[10px] text-[#888] block mb-1">
              Oscillator Type
            </label>
            <select
              className="w-full bg-[#3a3a3a] border border-[#555] rounded px-2 py-1 text-[11px]"
              value={(localConfig.oscillatorType as string) ?? "saw"}
              onChange={(e) => updateConfig({ oscillatorType: e.target.value })}
            >
              {[
                "saw",
                "square",
                "sine",
                "triangle",
                "noise",
                "fm",
                "pluck",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                label: "Detune",
                key: "oscillatorDetune",
                min: -100,
                max: 100,
                step: 1,
              },
              {
                label: "Cutoff",
                key: "filterCutoff",
                min: 20,
                max: 20000,
                step: 10,
              },
              {
                label: "Resonance",
                key: "filterResonance",
                min: 0,
                max: 1,
                step: 0.01,
              },
              { label: "Volume", key: "volume", min: 0, max: 1, step: 0.01 },
            ].map(({ label, key, min, max, step }) => (
              <div key={key}>
                <label className="text-[9px] text-[#888] block text-center">
                  {label}
                </label>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={(localConfig[key] as number) ?? 0.5}
                  onChange={(e) =>
                    updateConfig({ [key]: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-2 space-y-2 border-b border-[#4a4a4a] shrink-0">
        <div className="text-[10px] text-[#888] uppercase tracking-wider mb-1">
          ADSR
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "A", key: "ampEnvAttack", min: 0, max: 2, step: 0.01 },
            { label: "D", key: "ampEnvDecay", min: 0, max: 2, step: 0.01 },
            { label: "S", key: "ampEnvSustain", min: 0, max: 1, step: 0.01 },
            { label: "R", key: "ampEnvRelease", min: 0, max: 5, step: 0.01 },
          ].map(({ label, key, min, max, step }) => (
            <div key={key}>
              <label className="text-[9px] text-[#888] block text-center">
                {label}
              </label>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={(localConfig[key] as number) ?? 0.1}
                onChange={(e) =>
                  updateConfig({ [key]: Number(e.target.value) })
                }
                className="w-full"
              />
              <div className="text-[9px] text-[#666] text-center">
                {((localConfig[key] as number) ?? 0.1).toFixed(3)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto p-2 shrink-0">
        <div className="relative h-16 flex">
          {WHITE_KEYS.map((ni) =>
            renderPianoKey(ni, false, `${NOTES[ni]}${octaveOffset}`),
          )}
          {BLACK_KEYS.map((ni) =>
            renderPianoKey(ni, true, `${NOTES[ni]}${octaveOffset}`),
          )}
        </div>
      </div>
    </div>
  );
}

export function SynthEditor() {
  const presetId = useSyncExternalStore(
    instrumentManager.subscribe,
    () => instrumentManager.selectedId,
  );
  return <SynthEditorInner key={presetId} />;
}
