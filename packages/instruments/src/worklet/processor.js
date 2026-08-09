const TAU = Math.PI * 2;

const OSC_KIND = {
  sine: 0,
  saw: 1,
  square: 2,
  triangle: 3,
  noise: 4,
  fm: 5,
  pluck: 6,
};

const LFO_TARGET = { none: 0, pitch: 1, filter: 2, volume: 3 };

const DEFAULT_CHANNEL = {
  volume: 0.8,
  pan: 0,
  mute: false,
  insertDelay: false,
  insertReverb: false,
  sendLevel: 0,
};

class KaeldawProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const sampleRate =
      (options.processorOptions && options.processorOptions.sampleRate) ||
      48000;
    this.sampleRate = sampleRate;
    this.wasm = null;
    this.events = [];
    this.eventIndex = 0;
    this.currentSample = 0;
    this.tickToSampleRatio = 1;
    this.blockCounter = 0;
    this.metronomeEnabled = false;
    this.fadeOutSamples = 0;
    this.fadeOutTotal = 0;
    this.metronomePpqn = 960;
    this.beatsPerBar = 4;
    this.clickLength = 0;
    this.clickFrequency = 0;
    this.clickAmplitude = 0;
    this.clickDecay = 0;
    this.clickSampleCounter = 0;
    this.waveformBuffer = new Float32Array(2048);
    this.waveformIndex = 0;

    this.mixer = -1;
    this.reverbBus = 0;
    this.delayBus = 1;
    this.synthConfig = {};
    this.sampleData = null;
    this.sampleDataRate = sampleRate;
    this.channelSynths = new Map();
    this.channelSamplers = new Map();
    this.channelIndex = new Map();
    this.activeChannels = [];
    this.channelStates = new Map();

    this.port.onmessage = (event) => {
      const message = event.data;
      switch (message.type) {
        case "events": {
          this.currentSample = Math.round(
            ((message.startTick * 60) / (message.bpm * message.ppqn)) *
              this.sampleRate,
          );
          this.tickToSampleRatio =
            (60 / (message.bpm * message.ppqn)) * this.sampleRate;
          const sorted = message.events
            .slice()
            .sort((a, b) => a.tick - b.tick);
          const activeNotes = new Map();
          let eventIndex = 0;
          for (; eventIndex < sorted.length; eventIndex++) {
            const event = sorted[eventIndex];
            if (
              Math.round(event.tick * this.tickToSampleRatio) >=
              this.currentSample
            )
              break;
            if (event.type === "on") {
              activeNotes.set(event.note, {
                velocity: event.velocity,
                channelId: event.channelId || "",
              });
            } else {
              activeNotes.delete(event.note);
            }
          }
          this.events = sorted;
          this.eventIndex = eventIndex;
          for (const [note, noteState] of activeNotes) {
            this._ensureChannel(noteState.channelId);
            const synth = this._getSynth(noteState.channelId);
            if (synth) this.wasm.polysynth_note_on(synth, note, noteState.velocity);
          }
          break;
        }
        case "noteOn":
          this._ensureChannel(message.channelId || "");
          if (message.engine === "sampler") {
            const sampler = this._getSampler(message.channelId || "");
            if (sampler)
              this.wasm.sampler_note_on(sampler, message.note, message.vel);
          } else {
            const synth = this._getSynth(message.channelId || "");
            if (synth)
              this.wasm.polysynth_note_on(synth, message.note, message.vel);
          }
          break;
        case "noteOff":
          for (const handle of this.channelSynths.values()) {
            this.wasm?.polysynth_note_off(handle, message.note);
          }
          for (const handle of this.channelSamplers.values()) {
            this.wasm?.sampler_note_off(handle, message.note);
          }
          break;
        case "allOff":
          for (const handle of this.channelSynths.values()) {
            this.wasm?.polysynth_all_notes_off(handle);
          }
          for (const handle of this.channelSamplers.values()) {
            this.wasm?.sampler_all_notes_off(handle);
          }
          this.fadeOutSamples = Math.round(0.05 * this.sampleRate);
          this.fadeOutTotal = this.fadeOutSamples;
          break;
        case "cfg":
          this.synthConfig = message.config || {};
          if (this.wasm) {
            for (const handle of this.channelSynths.values()) {
              this._applyConfigToSynth(handle, this.synthConfig);
            }
          }
          break;
        case "metro":
          this.metronomePpqn = message.ppqn;
          this.beatsPerBar = message.beats;
          this.metronomeEnabled = message.enabled;
          break;
        case "channelFx": {
          const channelId = message.channelId;
          const state = this.channelStates.get(channelId) || {
            ...DEFAULT_CHANNEL,
          };
          if (message.volume !== undefined) state.volume = message.volume;
          if (message.pan !== undefined) state.pan = message.pan;
          if (message.mute !== undefined) state.mute = message.mute;
          if (message.insertDelay !== undefined)
            state.insertDelay = message.insertDelay;
          if (message.insertReverb !== undefined)
            state.insertReverb = message.insertReverb;
          if (message.sendLevel !== undefined)
            state.sendLevel = message.sendLevel;
          this.channelStates.set(channelId, state);
          this._applyChannelState(channelId);
          break;
        }
        case "loadSample":
          this.sampleData = new Float32Array(message.data);
          this.sampleDataRate = message.sampleRate || this.sampleRate;
          if (this.wasm) {
            for (const handle of this.channelSamplers.values()) {
              this._applySampleTo(handle);
            }
          }
          break;
        case "wasm": {
          (async () => {
            try {
              const self = this;
              const module = await WebAssembly.compile(message.bytes);
              const imports = {};
              for (const imp of WebAssembly.Module.imports(module)) {
                const mod = imports[imp.module] || (imports[imp.module] = {});
                if (imp.name.startsWith("__wbg___wbindgen_throw")) {
                  mod[imp.name] = function (a, b) {
                    throw new Error("WASM error");
                  };
                } else if (imp.name === "__wbindgen_init_externref_table") {
                  mod[imp.name] = function () {
                    const table = self.wasm.__wbindgen_externrefs;
                    const offset = table.grow(4);
                    table.set(0, undefined);
                    table.set(offset, undefined);
                    table.set(offset + 1, null);
                    table.set(offset + 2, true);
                    table.set(offset + 3, false);
                  };
                } else {
                  mod[imp.name] = function () {};
                }
              }
              const instance = new WebAssembly.Instance(module, imports);
              this.wasm = instance.exports;
              this.wasm.__wbindgen_start();
              this.mixer = this.wasm.mixer_new(this.sampleRate);
              this.reverbBus = this.wasm.mixer_add_bus(this.mixer);
              this.wasm.mixer_set_bus_insert_reverb(
                this.mixer,
                this.reverbBus,
                true,
              );
              this.delayBus = this.wasm.mixer_add_bus(this.mixer);
              this.wasm.mixer_set_bus_insert_delay(
                this.mixer,
                this.delayBus,
                true,
              );
              for (const channelId of this.activeChannels) {
                const index = this.wasm.mixer_add_channel(this.mixer);
                this.channelIndex.set(channelId, index);
              }
              for (const channelId of this.channelStates.keys()) {
                this._applyChannelState(channelId);
              }
              if (this.sampleData) {
                for (const handle of this.channelSamplers.values()) {
                  this._applySampleTo(handle);
                }
              }
              this.port.postMessage({ type: "wasm_ok" });
            } catch (error) {
              this.port.postMessage({
                type: "err",
                message: "WASM init: " + error,
              });
            }
          })();
          break;
        }
      }
    };
  }

  _applyConfigToSynth(synth, config) {
    const c = config || {};
    this.wasm.polysynth_set_oscillator_type(
      synth,
      OSC_KIND[c.oscillatorType] ?? 1,
    );
    this.wasm.polysynth_set_oscillator_detune(synth, c.oscillatorDetune ?? 0);
    this.wasm.polysynth_set_filter_cutoff(synth, c.filterCutoff ?? 8000);
    this.wasm.polysynth_set_filter_resonance(
      synth,
      c.filterResonance ?? 0.1,
    );
    this.wasm.polysynth_set_amp_env(
      synth,
      c.ampEnvAttack ?? 0.01,
      c.ampEnvDecay ?? 0.1,
      c.ampEnvSustain ?? 0.7,
      c.ampEnvRelease ?? 0.3,
    );
    this.wasm.polysynth_set_volume(synth, c.volume ?? 0.5);
    this.wasm.polysynth_set_pitch_env(
      synth,
      c.pitchEnvAmount ?? 0,
      c.pitchEnvAttack ?? 0,
    );
    this.wasm.polysynth_set_lfo(
      synth,
      c.lfoRate ?? 0,
      c.lfoDepth ?? 0,
      LFO_TARGET[c.lfoTarget] ?? 0,
    );
    this.wasm.polysynth_set_fm(
      synth,
      c.fmModRatio ?? 1,
      c.fmModLevel ?? 0,
      c.fmCarRatio ?? 1,
    );
    this.wasm.polysynth_set_pluck_damping(synth, c.pluckDamping ?? 0.5);
  }

  _ensureChannel(channelId) {
    if (this.channelIndex.has(channelId)) return;
    if (this.mixer === -1) {
      this.channelIndex.set(channelId, this.activeChannels.length);
      this.activeChannels.push(channelId);
      return;
    }
    const index = this.wasm.mixer_add_channel(this.mixer);
    this.channelIndex.set(channelId, index);
    this.activeChannels.push(channelId);
  }

  _applyChannelState(channelId) {
    if (channelId === "reverb-bus" || channelId === "delay-bus") return;
    const state = this.channelStates.get(channelId) || DEFAULT_CHANNEL;
    this._ensureChannel(channelId);
    if (this.mixer === -1) return;
    const index = this.channelIndex.get(channelId) ?? 0;
    this.wasm.mixer_set_channel_volume(this.mixer, index, state.volume);
    this.wasm.mixer_set_channel_pan(this.mixer, index, state.pan);
    this.wasm.mixer_set_channel_mute(this.mixer, index, state.mute);
    this.wasm.mixer_set_channel_insert_delay(
      this.mixer,
      index,
      state.insertDelay,
    );
    this.wasm.mixer_set_channel_insert_reverb(
      this.mixer,
      index,
      state.insertReverb,
    );
    this.wasm.mixer_set_channel_send(
      this.mixer,
      index,
      this.reverbBus,
      state.sendLevel,
    );
  }

  _getSynth(channelId) {
    if (!this.wasm) return null;
    if (!this.channelSynths.has(channelId)) {
      const synth = this.wasm.polysynth_new(
        this.sampleRate,
        this.synthConfig.polyphony ?? 8,
      );
      this._applyConfigToSynth(synth, this.synthConfig);
      this.channelSynths.set(channelId, synth);
    }
    return this.channelSynths.get(channelId);
  }

  _getSampler(channelId) {
    if (!this.wasm) return null;
    if (!this.channelSamplers.has(channelId)) {
      const sampler = this.wasm.sampler_new(this.sampleRate);
      if (this.sampleData) this._applySampleTo(sampler);
      this.channelSamplers.set(channelId, sampler);
    }
    return this.channelSamplers.get(channelId);
  }

  _applySampleTo(handle) {
    if (!this.sampleData || !this.wasm) return;
    const bytes = this.sampleData.byteLength;
    const ptr = this.wasm.dsp_alloc(bytes);
    new Float32Array(this.wasm.memory.buffer, ptr, this.sampleData.length).set(
      this.sampleData,
    );
    this.wasm.sampler_set_sample_ptr(
      handle,
      ptr,
      this.sampleData.length,
      this.sampleDataRate,
      60,
    );
    this.wasm.dsp_free(ptr, bytes);
  }

  process(inputs, outputs, parameters) {
    try {
      const leftOutput = outputs[0] && outputs[0][0];
      const rightOutput = outputs[0] && outputs[0][1];
      if (!leftOutput || !rightOutput) return true;

      const wasmReady = this.wasm !== null && this.mixer !== -1;

      for (
        let sampleIndex = 0;
        sampleIndex < leftOutput.length;
        sampleIndex++
      ) {
        const currentSamplePosition = this.currentSample + sampleIndex;

        while (this.eventIndex < this.events.length) {
          const event = this.events[this.eventIndex];
          const eventSamplePosition = Math.round(
            event.tick * this.tickToSampleRatio,
          );
          if (eventSamplePosition > currentSamplePosition) break;
          this.eventIndex++;
          if (eventSamplePosition === currentSamplePosition && wasmReady) {
            const channelId = event.channelId || "";
            this._ensureChannel(channelId);
            if (event.type === "on") {
              if (this.channelSamplers.has(channelId)) {
                const sampler = this._getSampler(channelId);
                this.wasm.sampler_note_on(sampler, event.note, event.velocity);
              } else {
                const synth = this._getSynth(channelId);
                if (synth)
                  this.wasm.polysynth_note_on(synth, event.note, event.velocity);
              }
            } else {
              const synth = this.channelSynths.get(channelId);
              const sampler = this.channelSamplers.get(channelId);
              if (synth) this.wasm.polysynth_note_off(synth, event.note);
              if (sampler) this.wasm.sampler_note_off(sampler, event.note);
            }
          }
        }

        let masterLeft = 0;
        let masterRight = 0;

        if (wasmReady) {
          for (let i = 0; i < this.activeChannels.length; i++) {
            const channelId = this.activeChannels[i];
            let sample = 0;
            const synth = this.channelSynths.get(channelId);
            const sampler = this.channelSamplers.get(channelId);
            if (synth) sample = this.wasm.polysynth_process_sample(synth);
            else if (sampler)
              sample = this.wasm.sampler_process_sample(sampler);
            const index = this.channelIndex.get(channelId) ?? i;
            this.wasm.mixer_process_channel_index(this.mixer, index, sample, sample);
          }
          this.wasm.mixer_finish_frame(this.mixer);
          masterLeft = this.wasm.mixer_get_master_left(this.mixer);
          masterRight = this.wasm.mixer_get_master_right(this.mixer);
        }

        if (this.metronomeEnabled) {
          const tickAtSample = currentSamplePosition / this.tickToSampleRatio;
          const currentTick = Math.floor(tickAtSample);
          const previousTick = Math.floor(
            (currentSamplePosition - 1) / this.tickToSampleRatio,
          );

          if (
            currentTick !== previousTick &&
            currentTick % this.metronomePpqn === 0
          ) {
            const isDownbeat =
              currentTick % (this.metronomePpqn * this.beatsPerBar) === 0;
            this.clickFrequency = isDownbeat ? 1200 : 1800;
            this.clickAmplitude = isDownbeat ? 0.5 : 0.35;
            this.clickDecay = isDownbeat ? 350 : 450;
            this.clickLength = Math.round(0.004 * this.sampleRate);
            this.clickSampleCounter = 0;
          }

          if (this.clickLength > 0) {
            const time = this.clickSampleCounter / this.sampleRate;
            const envelope = Math.exp(-time * this.clickDecay);
            const clickSample =
              Math.sin(2 * Math.PI * this.clickFrequency * time) *
              this.clickAmplitude *
              envelope;
            masterLeft += clickSample;
            masterRight += clickSample;
            this.clickLength--;
            this.clickSampleCounter++;
          }
        }

        if (this.fadeOutSamples > 0) {
          const fade = this.fadeOutSamples / this.fadeOutTotal;
          masterLeft *= fade;
          masterRight *= fade;
          this.fadeOutSamples--;
        }

        leftOutput[sampleIndex] = masterLeft;
        rightOutput[sampleIndex] = masterRight;

        this.waveformBuffer[this.waveformIndex] =
          (masterLeft + masterRight) * 0.5;
        this.waveformIndex =
          (this.waveformIndex + 1) % this.waveformBuffer.length;
      }

      this.currentSample += leftOutput.length;
      this.blockCounter++;

      if (this.blockCounter % 20 === 0) {
        const waveformCopy = new Float32Array(this.waveformBuffer.length);
        for (let i = 0; i < waveformCopy.length; i++) {
          waveformCopy[i] =
            this.waveformBuffer[
              (this.waveformIndex + i) % this.waveformBuffer.length
            ];
        }
        this.port.postMessage({ type: "wf", buffer: waveformCopy.buffer }, [
          waveformCopy.buffer,
        ]);
      }
    } catch (error) {
      this.port.postMessage({ type: "err", message: String(error) });
    }

    return true;
  }
}

registerProcessor("kaeldaw-synth", KaeldawProcessor);
