const TAU = Math.PI * 2;
const TABLE_SIZE = 4096;

function generateSawTable(harmonics) {
  const table = new Float32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) {
    const phase = i / TABLE_SIZE;
    let sum = 0;
    for (let harmonic = 1; harmonic <= harmonics; harmonic++)
      sum += Math.sin(TAU * harmonic * phase) / harmonic;
    table[i] = sum * (-2 / Math.PI);
  }
  return table;
}

function generateSquareTable(harmonics) {
  const table = new Float32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) {
    const phase = i / TABLE_SIZE;
    let sum = 0;
    for (let harmonic = 1; harmonic <= harmonics; harmonic += 2)
      sum += Math.sin(TAU * harmonic * phase) / harmonic;
    table[i] = sum * (4 / Math.PI);
  }
  return table;
}

const SAW_TABLES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512].map((count) =>
  generateSawTable(count),
);
const SQUARE_TABLES = [1, 3, 7, 15, 31, 63, 127, 255, 511].map((count) =>
  generateSquareTable(count),
);

function pickTableIndex(harmonicCounts, frequency, sampleRate) {
  const maxHarmonic = Math.floor(sampleRate / 2 / frequency);
  for (let i = 0; i < harmonicCounts.length; i++) {
    if (harmonicCounts[i] <= maxHarmonic) return i;
  }
  return harmonicCounts.length - 1;
}

function readTable(table, phase) {
  const position = phase * TABLE_SIZE;
  const index = Math.floor(position) % TABLE_SIZE;
  const fraction = position - index;
  const nextIndex = (index + 1) % TABLE_SIZE;
  return table[index] + fraction * (table[nextIndex] - table[index]);
}

function midiToFrequency(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

class Oscillator {
  constructor(type) {
    this.phase = 0;
    this.modPhase = 0;
    this.type = type;
    this.ksDelay = null;
    this.ksIndex = 0;
    this.ksLength = 0;
  }

  next(frequency, sampleRate, config) {
    if (frequency <= 0 || sampleRate <= 0) return 0;
    const increment = frequency / sampleRate;
    let output;

    switch (this.type) {
      case "sine":
        output = Math.sin(TAU * this.phase);
        break;
      case "saw":
        output = readTable(
          SAW_TABLES[pickTableIndex([512, 256, 128, 64, 32, 16, 8, 4, 2, 1], frequency, sampleRate)],
          this.phase,
        );
        break;
      case "square":
        output = readTable(
          SQUARE_TABLES[pickTableIndex([511, 255, 127, 63, 31, 15, 7, 3, 1], frequency, sampleRate)],
          this.phase,
        );
        break;
      case "triangle":
        output = 2 * Math.abs(2 * this.phase - 1) - 1;
        break;
      case "noise":
        output = Math.random() * 2 - 1;
        break;
      case "fm": {
        const modRatio = config?.fmModRatio ?? 4.76;
        const modLevel = config?.fmModLevel ?? 0.8;
        const carRate = config?.fmCarRatio ?? 1;
        const modFreq = frequency * modRatio;
        const modInc = modFreq / sampleRate;
        this.modPhase = (this.modPhase + modInc) % 1.0;
        const modulator = Math.sin(TAU * this.modPhase) * modLevel * modFreq;
        const carInc = (frequency * carRate + modulator) / sampleRate;
        this.phase = (this.phase + carInc) % 1.0;
        output = Math.sin(TAU * this.phase);
        break;
      }
      case "pluck": {
        if (!this.ksDelay) {
          this.ksLength = Math.max(2, Math.round(sampleRate / frequency));
          this.ksDelay = new Float32Array(this.ksLength);
          for (let i = 0; i < this.ksLength; i++)
            this.ksDelay[i] = Math.random() * 2 - 1;
          this.ksIndex = 0;
        }
        const current = this.ksDelay[this.ksIndex];
        const nextIdx = (this.ksIndex + 1) % this.ksLength;
        const nextSample = this.ksDelay[nextIdx];
        const damping = config?.pluckDamping ?? 0.5;
        const filtered = current + damping * (nextSample - current);
        this.ksDelay[this.ksIndex] = filtered * 0.996;
        this.ksIndex = nextIdx;
        output = current;
        break;
      }
      default:
        output = readTable(
          SQUARE_TABLES[pickTableIndex([511, 255, 127, 63, 31, 15, 7, 3, 1], frequency, sampleRate)],
          this.phase,
        );
    }

    if (this.type !== "fm" && this.type !== "pluck")
      this.phase = (this.phase + increment) % 1.0;
    return output;
  }
}

class Delay {
  constructor(sampleRate, maxDelaySeconds) {
    this.sampleRate = sampleRate;
    this.buffer = new Float32Array(Math.round(sampleRate * maxDelaySeconds));
    this.writePosition = 0;
    this.delaySamples = Math.round(sampleRate * 0.4);
    this.feedback = 0.4;
    this.mix = 0.3;
  }

  run(input) {
    const readIndex =
      (this.writePosition - this.delaySamples + this.buffer.length) %
      this.buffer.length;
    const delayedSample = this.buffer[readIndex];
    this.buffer[this.writePosition] = input + delayedSample * this.feedback;
    this.writePosition = (this.writePosition + 1) % this.buffer.length;
    return input + (delayedSample - input) * this.mix;
  }
}

class Reverb {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.combFilters = [0.05, 0.056, 0.061, 0.068].map((delaySeconds) => ({
      buffer: new Float32Array(Math.round(delaySeconds * sampleRate)),
      writePosition: 0,
      length: Math.round(delaySeconds * sampleRate),
    }));
    this.allpassFilters = [0.012, 0.017].map((delaySeconds) => ({
      buffer: new Float32Array(Math.round(delaySeconds * sampleRate)),
      writePosition: 0,
      length: Math.round(delaySeconds * sampleRate),
    }));
    this.decay = 0.4;
    this.mix = 0.3;
    this.damping = 0.5;
  }

  run(input) {
    let signal = input;
    for (const comb of this.combFilters) {
      const readIndex =
        (comb.writePosition - comb.length + comb.buffer.length) %
        comb.buffer.length;
      const feedbackSample = comb.buffer[readIndex];
      comb.buffer[comb.writePosition] = signal + feedbackSample * this.decay;
      comb.writePosition = (comb.writePosition + 1) % comb.length;
      signal = (signal + feedbackSample * (1 - this.damping)) / 2;
    }
    for (const allpass of this.allpassFilters) {
      const readIndex =
        (allpass.writePosition - allpass.length + allpass.buffer.length) %
        allpass.buffer.length;
      const delayedSample = allpass.buffer[readIndex];
      allpass.buffer[allpass.writePosition] = signal + delayedSample * 0.5;
      allpass.writePosition = (allpass.writePosition + 1) % allpass.length;
      signal = (delayedSample - signal) * 0.5;
    }
    return input * (1 - this.mix) + signal * this.mix;
  }
}

class AdsrEnvelope {
  constructor(attackTime, decayTime, sustainLevel, releaseTime) {
    this.attack = Math.max(0, attackTime);
    this.decay = Math.max(0, decayTime);
    this.sustain = Math.max(0, Math.min(1, sustainLevel));
    this.release = Math.max(0, releaseTime);
    this.level = 0;
    this.state = 0;
    this.elapsed = 0;
    this.releaseLevel = 0;
  }

  on() {
    this.state = 1;
    this.elapsed = 0;
    if (this.attack <= 0) {
      this.level = 1;
      this.state = 2;
    } else {
      this.level = 0;
    }
  }

  off() {
    if (this.state === 0) return;
    this.releaseLevel = this.level;
    this.state = 4;
    this.elapsed = 0;
  }

  tick(deltaTime) {
    switch (this.state) {
      case 1:
        this.elapsed += deltaTime;
        if (this.elapsed >= this.attack) {
          this.level = 1;
          this.state = 2;
          this.elapsed = 0;
        } else {
          this.level = this.elapsed / this.attack;
        }
        break;
      case 2:
        if (this.decay <= 0) {
          this.level = this.sustain;
          this.state = 3;
        } else {
          this.elapsed += deltaTime;
          if (this.elapsed >= this.decay) {
            this.level = this.sustain;
            this.state = 3;
          } else {
            this.level = 1 + (this.elapsed / this.decay) * (this.sustain - 1);
          }
        }
        break;
      case 3:
        this.level = this.sustain;
        break;
      case 4:
        if (this.release <= 0) {
          this.level = 0;
          this.state = 0;
        } else {
          this.elapsed += deltaTime;
          if (this.elapsed >= this.release) {
            this.level = 0;
            this.state = 0;
          } else {
            this.level = this.releaseLevel * (1 - this.elapsed / this.release);
          }
        }
        break;
    }
    return this.level;
  }

  get done() {
    return this.state === 0;
  }
}

class BiquadFilter {
  constructor(b0, b1, b2, a1, a2) {
    this.b0 = b0;
    this.b1 = b1;
    this.b2 = b2;
    this.a1 = a1;
    this.a2 = a2;
    this.z1 = 0;
    this.z2 = 0;
  }

  run(input) {
    const output = this.b0 * input + this.z1;
    this.z1 = this.b1 * input + this.z2 - this.a1 * output;
    this.z2 = this.b2 * input - this.a2 * output;
    return output;
  }
}

function calculateLowPassCoefficients(sampleRate, cutoff, resonance) {
  const clampedCutoff = Math.max(20, Math.min(cutoff, sampleRate * 0.49));
  const clampedResonance = resonance < 0.1 ? 0.707 : resonance;
  const omega = (TAU * clampedCutoff) / sampleRate;
  const sinOmega = Math.sin(omega);
  const cosOmega = Math.cos(omega);
  const alpha = sinOmega / (2 * clampedResonance);
  const denominator = 1 / (1 + alpha);
  return [
    ((1 - cosOmega) / 2) * denominator,
    (1 - cosOmega) * denominator,
    ((1 - cosOmega) / 2) * denominator,
    -2 * cosOmega * denominator,
    (1 - alpha) * denominator,
  ];
}

const DEFAULTS = {
  oscillatorType: "saw",
  oscillatorDetune: 0,
  filterCutoff: 8000,
  filterResonance: 0.1,
  ampEnvAttack: 0.01,
  ampEnvDecay: 0.1,
  ampEnvSustain: 0.7,
  ampEnvRelease: 0.15,
  volume: 0.5,
};

let wasmModule = null;
let wasmOscSeed = 1;

const OSC_KIND = {
  sine: 0,
  saw: 1,
  square: 2,
  triangle: 3,
  noise: 4,
  fm: 5,
  pluck: 6,
};

function useWasm() {
  return wasmModule !== null;
}

class WasmOscillator {
  constructor(type, sampleRate) {
    this.pointer = wasmModule.oscillator_new(
      OSC_KIND[type] ?? 1,
      sampleRate,
      wasmOscSeed++ >>> 0,
    );
  }

  next(frequency, sampleRate, config) {
    return wasmModule.oscillator_process(
      this.pointer,
      frequency,
      config?.fmModRatio ?? 4.76,
      config?.fmModLevel ?? 0.8,
      config?.fmCarRatio ?? 1,
      config?.pluckDamping ?? 0.5,
    );
  }

  free() {
    if (this.pointer !== 0) {
      wasmModule.__wbg_oscillator_free(this.pointer, 0);
      this.pointer = 0;
    }
  }
}

class WasmAdsrEnvelope {
  constructor(attack, decay, sustain, release) {
    this.wasmPointer = wasmModule.adsrenvelope_new(
      attack,
      decay,
      sustain,
      release,
    );
  }

  on() {
    wasmModule.adsrenvelope_note_on(this.wasmPointer);
  }

  off() {
    wasmModule.adsrenvelope_note_off(this.wasmPointer);
  }

  tick(deltaTime) {
    return wasmModule.adsrenvelope_process(this.wasmPointer, deltaTime);
  }

  get done() {
    return wasmModule.adsrenvelope_is_finished(this.wasmPointer) !== 0;
  }

  free() {
    if (this.wasmPointer !== 0) {
      wasmModule.__wbg_adsrenvelope_free(this.wasmPointer, 0);
      this.wasmPointer = 0;
    }
  }
}

class WasmBiquadFilter {
  constructor(sampleRate, cutoff, resonance) {
    this.handle = wasmModule.biquad_set(sampleRate, 0, cutoff, resonance, 0);
  }

  run(input) {
    return wasmModule.biquad_process(this.handle, input);
  }

  free() {
    if (this.handle !== -1 && this.handle !== undefined) {
      wasmModule.biquad_free(this.handle);
      this.handle = -1;
    }
  }
}

class WasmDelay {
  constructor(sampleRate) {
    this.handle = wasmModule.delay_init(sampleRate, 2);
    wasmModule.delay_set(this.handle, 0.4, 0.4, 0.3);
  }

  run(input) {
    return wasmModule.delay_process(this.handle, input);
  }

  free() {
    if (this.handle !== -1) {
      wasmModule.delay_free(this.handle);
      this.handle = -1;
    }
  }
}

class WasmReverb {
  constructor(sampleRate) {
    this.handle = wasmModule.reverb_init(sampleRate);
    wasmModule.reverb_set(this.handle, 0.4, 0.3, 0.5);
  }

  run(input) {
    return wasmModule.reverb_process(this.handle, input);
  }

  free() {
    if (this.handle !== -1) {
      wasmModule.reverb_free(this.handle);
      this.handle = -1;
    }
  }
}

function createOscillator(type, sampleRate) {
  return useWasm()
    ? new WasmOscillator(type, sampleRate)
    : new Oscillator(type);
}

function createAdsrEnvelope(attack, decay, sustain, release) {
  return useWasm()
    ? new WasmAdsrEnvelope(attack, decay, sustain, release)
    : new AdsrEnvelope(attack, decay, sustain, release);
}

function createFilter(sampleRate, cutoff, resonance) {
  return useWasm()
    ? new WasmBiquadFilter(sampleRate, cutoff, resonance)
    : new BiquadFilter(
        ...calculateLowPassCoefficients(sampleRate, cutoff, resonance),
      );
}

function createDelay(sampleRate) {
  return useWasm() ? new WasmDelay(sampleRate) : new Delay(sampleRate, 2);
}

function createReverb(sampleRate) {
  return useWasm() ? new WasmReverb(sampleRate) : new Reverb(sampleRate);
}

class Synth {
  constructor(sampleRate, config) {
    this.sampleRate = sampleRate;
    this.deltaTime = 1 / sampleRate;
    this.config = Object.assign({}, DEFAULTS, config || {});
    this.voices = [];
    for (let i = 0; i < 6; i++) this.voices.push(this._createVoice());
    this.ageCounter = 0;
  }

  _createVoice() {
    return {
      on: false,
      note: 0,
      velocity: 0,
      age: 0,
      released: false,
      fadeIn: 0,
      channelId: "",
      oscillator: createOscillator(this.config.oscillatorType, this.sampleRate),
      adsr: createAdsrEnvelope(
        this.config.ampEnvAttack,
        this.config.ampEnvDecay,
        this.config.ampEnvSustain,
        this.config.ampEnvRelease,
      ),
      filter: createFilter(
        this.sampleRate,
        this.config.filterCutoff,
        this.config.filterResonance,
      ),
    };
  }

  _allocateVoice() {
    for (let i = 0; i < this.voices.length; i++) {
      if (!this.voices[i].on) return this.voices[i];
    }
    let oldestVoice = this.voices[0];
    for (let i = 1; i < this.voices.length; i++) {
      if (this.voices[i].age < oldestVoice.age) oldestVoice = this.voices[i];
    }
    if (oldestVoice.on)
      oldestVoice.fadeIn = Math.round(0.005 * this.sampleRate);
    return oldestVoice;
  }

  _freeVoiceResources(voice) {
    if (voice.oscillator && typeof voice.oscillator.free === "function")
      voice.oscillator.free();
    if (voice.adsr && typeof voice.adsr.free === "function") voice.adsr.free();
    if (voice.filter && typeof voice.filter.free === "function")
      voice.filter.free();
  }

  noteOn(note, velocity, channelId) {
    const voice = this._allocateVoice();
    this._freeVoiceResources(voice);
    voice.note = Math.max(0, Math.min(127, Math.round(note) | 0));
    voice.velocity = Math.max(0, Math.min(127, velocity)) / 127;
    voice.age = ++this.ageCounter;
    voice.on = true;
    voice.released = false;
    voice.channelId = channelId || "";
    voice.oscillator = createOscillator(
      this.config.oscillatorType,
      this.sampleRate,
    );
    voice.adsr = createAdsrEnvelope(
      this.config.ampEnvAttack,
      this.config.ampEnvDecay,
      this.config.ampEnvSustain,
      this.config.ampEnvRelease,
    );
    voice.adsr.on();
    voice.filter = createFilter(
      this.sampleRate,
      this.config.filterCutoff,
      this.config.filterResonance,
    );
  }

  noteOff(note) {
    for (let i = 0; i < this.voices.length; i++) {
      const voice = this.voices[i];
      if (voice.on && voice.note === note && !voice.released) {
        voice.released = true;
        voice.adsr.off();
      }
    }
  }

  allOff() {
    for (let i = 0; i < this.voices.length; i++) {
      const voice = this.voices[i];
      if (voice.on) {
        voice.released = true;
        voice.adsr.off();
      }
    }
  }

  setConfig(config) {
    if (config) Object.assign(this.config, config);
  }

  sample() {
    const channelOutputs = {};
    let voiceCount = 0;
    const detuneFactor = Math.pow(2, this.config.oscillatorDetune / 1200);
    const volume = this.config.volume;

    for (let voiceIndex = 0; voiceIndex < this.voices.length; voiceIndex++) {
      const voice = this.voices[voiceIndex];
      if (!voice.on) continue;

      const frequency = midiToFrequency(voice.note) * detuneFactor || 0;
      if (frequency <= 0 || !isFinite(frequency)) continue;

      const oscillatorOutput =
        voice.oscillator.next(frequency, this.sampleRate, this.config) || 0;
      const filterOutput = voice.filter.run(oscillatorOutput) || 0;
      const amplitude = voice.adsr.tick(this.deltaTime) || 0;
      let sampleValue = filterOutput * amplitude * voice.velocity * volume;

      if (voice.fadeIn > 0) {
        sampleValue *= 1 - voice.fadeIn / Math.round(0.005 * this.sampleRate);
        voice.fadeIn--;
      }

      const channelId = voice.channelId || "default";
      channelOutputs[channelId] =
        (channelOutputs[channelId] || 0) + sampleValue;
      voiceCount++;

      if (voice.adsr.done) voice.on = false;
    }

    if (voiceCount > 1) {
      const normalization = 1 / Math.sqrt(voiceCount);
      for (const channelId in channelOutputs) {
        channelOutputs[channelId] *= normalization;
      }
    }

    for (const channelId in channelOutputs) {
      channelOutputs[channelId] =
        channelOutputs[channelId] / (1 + Math.abs(channelOutputs[channelId]));
    }

    return channelOutputs;
  }
}

class WorkletSampler {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.buffer = null;
    this.bufferSampleRate = sampleRate;
    this.rootNote = 60;
    this.voices = [];
    for (let i = 0; i < 8; i++) {
      this.voices.push({
        on: false,
        note: 60,
        velocity: 0,
        position: 0,
        released: false,
        age: 0,
        envelopeLevel: 0,
        envelopeState: 0,
        envelopeTime: 0,
        envelopeReleaseLevel: 0,
        channelId: "",
      });
    }
    this.ageCounter = 0;
  }

  _allocateVoice() {
    for (let i = 0; i < this.voices.length; i++) {
      if (!this.voices[i].on) return this.voices[i];
    }
    let oldestVoice = this.voices[0];
    for (let i = 1; i < this.voices.length; i++) {
      if (this.voices[i].age < oldestVoice.age) oldestVoice = this.voices[i];
    }
    oldestVoice.on = false;
    return oldestVoice;
  }

  setBuffer(data, sampleRate) {
    this.buffer = data;
    this.bufferSampleRate = sampleRate;
  }

  noteOn(note, velocity, channelId) {
    if (!this.buffer) return;
    const voice = this._allocateVoice();
    voice.note = note;
    voice.velocity = velocity / 127;
    voice.position = 0;
    voice.on = true;
    voice.released = false;
    voice.age = ++this.ageCounter;
    voice.channelId = channelId || "";
    voice.envelopeLevel = 0;
    voice.envelopeState = 1;
    voice.envelopeTime = 0;
  }

  noteOff(note) {
    for (const voice of this.voices) {
      if (voice.on && voice.note === note && !voice.released) {
        voice.released = true;
        voice.envelopeReleaseLevel = voice.envelopeLevel;
        voice.envelopeState = 4;
        voice.envelopeTime = 0;
      }
    }
  }

  allOff() {
    for (const voice of this.voices) {
      if (voice.on) {
        voice.released = true;
        voice.envelopeReleaseLevel = voice.envelopeLevel;
        voice.envelopeState = 4;
        voice.envelopeTime = 0;
      }
    }
  }

  sample() {
    const channelOutputs = {};
    const deltaTime = 1 / this.sampleRate;

    for (const voice of this.voices) {
      if (!voice.on) continue;

      const pitchRatio =
        Math.pow(2, (voice.note - this.rootNote) / 12) *
        (this.sampleRate / this.bufferSampleRate);

      if (!this.buffer || voice.position >= this.buffer.length) {
        voice.on = false;
        continue;
      }

      const sampleIndex = Math.floor(voice.position);
      const fraction = voice.position - sampleIndex;
      const sampleA = this.buffer[sampleIndex] || 0;
      const sampleB =
        this.buffer[Math.min(sampleIndex + 1, this.buffer.length - 1)] || 0;
      const interpolatedSample = sampleA + fraction * (sampleB - sampleA);

      let amplitude = 0;
      switch (voice.envelopeState) {
        case 1:
          voice.envelopeTime += deltaTime;
          if (voice.envelopeTime >= 0.01) {
            voice.envelopeLevel = 1;
            voice.envelopeState = 2;
            voice.envelopeTime = 0;
          } else {
            voice.envelopeLevel = voice.envelopeTime / 0.01;
          }
          break;
        case 2:
          voice.envelopeTime += deltaTime;
          if (voice.envelopeTime >= 0.1) {
            voice.envelopeLevel = 1;
            voice.envelopeState = 3;
          } else {
            voice.envelopeLevel = voice.envelopeTime / 0.1;
          }
          break;
        case 3:
          voice.envelopeLevel = 1;
          break;
        case 4:
          voice.envelopeTime += deltaTime;
          if (voice.envelopeTime >= 0.2) {
            voice.envelopeLevel = 0;
            voice.on = false;
          } else {
            voice.envelopeLevel =
              voice.envelopeReleaseLevel * (1 - voice.envelopeTime / 0.2);
          }
          break;
      }

      amplitude = voice.envelopeLevel * voice.velocity;
      const channelId = voice.channelId || "default";
      channelOutputs[channelId] =
        (channelOutputs[channelId] || 0) + interpolatedSample * amplitude;
      voice.position += pitchRatio;
    }

    return channelOutputs;
  }
}

class KaeldawProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const sampleRate =
      (options.processorOptions && options.processorOptions.sampleRate) ||
      48000;
    this.synth = new Synth(sampleRate);
    this.sampler = new WorkletSampler(sampleRate);
    this.sampleRate = sampleRate;
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
    this.channelStates = {};
    this.channelDelay = {};
    this.channelReverb = {};
    this.busDelay = {};
    this.busReverb = {};

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
          const sorted = message.events.slice().sort((a, b) => a.tick - b.tick);
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
            this.synth.noteOn(note, noteState.velocity, noteState.channelId);
          }
          break;
        }
        case "noteOn":
          if (message.engine === "sampler") {
            this.sampler.noteOn(
              message.note,
              message.vel,
              message.channelId || "",
            );
          } else {
            this.synth.noteOn(
              message.note,
              message.vel,
              message.channelId || "",
            );
          }
          break;
        case "noteOff":
          this.synth.noteOff(message.note);
          this.sampler.noteOff(message.note);
          break;
        case "allOff":
          this.synth.allOff();
          this.sampler.allOff();
          this.fadeOutSamples = Math.round(0.05 * this.sampleRate);
          this.fadeOutTotal = this.fadeOutSamples;
          break;
        case "cfg":
          this.synth.setConfig(message.config);
          break;
        case "metro":
          this.metronomePpqn = message.ppqn;
          this.beatsPerBar = message.beats;
          this.metronomeEnabled = message.enabled;
          break;
        case "channelFx": {
          const channelState = this.channelStates[message.channelId] || {};
          if (message.volume !== undefined)
            channelState.volume = message.volume;
          if (message.pan !== undefined) channelState.pan = message.pan;
          if (message.mute !== undefined) channelState.mute = message.mute;
          if (message.insertDelay !== undefined)
            channelState.insertDelay = message.insertDelay;
          if (message.insertReverb !== undefined)
            channelState.insertReverb = message.insertReverb;
          if (message.sendLevel !== undefined)
            channelState.sendLevel = message.sendLevel;
          this.channelStates[message.channelId] = channelState;
          break;
        }
        case "loadSample": {
          if (this.sampler) {
            this.sampler.setBuffer(
              new Float32Array(message.data),
              message.sampleRate || this.sampleRate,
            );
          }
          break;
        }
        case "wasm": {
          try {
            const instance = new WebAssembly.Instance(message.module, {
              wbg: {
                __wbindgen_throw: function (a, b) {
                  throw new Error("WASM error");
                },
                __wbindgen_init_externref_table: function () {},
              },
            });
            wasmModule = instance.exports;
            wasmModule.__wbindgen_start();
            this.port.postMessage({ type: "wasm_ok" });
          } catch (error) {
            this.port.postMessage({
              type: "err",
              message: "WASM init: " + error,
            });
          }
          break;
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    try {
      const leftOutput = outputs[0] && outputs[0][0];
      const rightOutput = outputs[0] && outputs[0][1];
      if (!leftOutput || !rightOutput) return true;

      const defaultChannel = {
        volume: 0.8,
        pan: 0,
        mute: false,
        insertDelay: false,
        insertReverb: false,
        sendLevel: 0,
      };

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
          if (eventSamplePosition === currentSamplePosition) {
            if (event.type === "on") {
              this.synth.noteOn(
                event.note,
                event.velocity,
                event.channelId || "",
              );
            } else {
              this.synth.noteOff(event.note);
            }
          }
        }

        const channelOutputs = this.synth.sample();
        const samplerOutputs = this.sampler.sample();
        for (const channelKey in samplerOutputs) {
          channelOutputs[channelKey] =
            (channelOutputs[channelKey] || 0) + samplerOutputs[channelKey];
        }

        let masterSample = 0;
        const busAccumulators = {};

        for (const channelId in channelOutputs) {
          const channelSum = channelOutputs[channelId];
          const channelState = this.channelStates[channelId] || defaultChannel;
          if (channelState.mute) continue;

          let processedSample = channelSum;

          if (channelState.insertDelay) {
            if (!this.channelDelay[channelId])
              this.channelDelay[channelId] = createDelay(this.sampleRate);
            processedSample = this.channelDelay[channelId].run(processedSample);
          }

          if (channelState.insertReverb) {
            if (!this.channelReverb[channelId])
              this.channelReverb[channelId] = createReverb(this.sampleRate);
            processedSample =
              this.channelReverb[channelId].run(processedSample);
          }

          if (channelState.sendLevel > 0) {
            busAccumulators["reverb-bus"] =
              (busAccumulators["reverb-bus"] || 0) +
              processedSample * channelState.sendLevel;
          }

          const angle = ((channelState.pan + 1) * Math.PI) / 4;
          masterSample +=
            processedSample *
            channelState.volume *
            (Math.cos(angle) + Math.sin(angle));
        }

        for (const busId in busAccumulators) {
          const busState = this.channelStates[busId];
          if (!busState) continue;

          let processedSample = busAccumulators[busId];

          if (busState.insertDelay) {
            if (!this.busDelay[busId])
              this.busDelay[busId] = createDelay(this.sampleRate);
            processedSample = this.busDelay[busId].run(processedSample);
          }

          if (busState.insertReverb) {
            if (!this.busReverb[busId])
              this.busReverb[busId] = createReverb(this.sampleRate);
            processedSample = this.busReverb[busId].run(processedSample);
          }

          masterSample += processedSample * busState.volume;
        }

        masterSample = masterSample / (1 + Math.abs(masterSample));

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
            masterSample += clickSample;
            this.clickLength--;
            this.clickSampleCounter++;
          }
        }

        if (this.fadeOutSamples > 0) {
          masterSample *= this.fadeOutSamples / this.fadeOutTotal;
          this.fadeOutSamples--;
        }

        leftOutput[sampleIndex] = masterSample;
        rightOutput[sampleIndex] = masterSample;

        this.waveformBuffer[this.waveformIndex] = masterSample;
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
