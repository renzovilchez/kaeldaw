use wasm_bindgen::prelude::*;

use crate::adsr::AdsrEnvelope;
use crate::biquad::{biquad_free, biquad_process, biquad_set};
use crate::osc::Oscillator;

const TAU: f32 = 2.0 * std::f32::consts::PI;
const KIND_SAW: u32 = 1;
const TARGET_NONE: u32 = 0;
const TARGET_PITCH: u32 = 1;
const TARGET_FILTER: u32 = 2;
const TARGET_VOLUME: u32 = 3;

struct SynthConfig {
    oscillator_type: u32,
    oscillator_detune: f32,
    filter_cutoff: f32,
    filter_resonance: f32,
    amp_env_attack: f32,
    amp_env_decay: f32,
    amp_env_sustain: f32,
    amp_env_release: f32,
    volume: f32,
    polyphony: usize,
    pitch_env_amount: f32,
    pitch_env_attack: f32,
    lfo_rate: f32,
    lfo_depth: f32,
    lfo_target: u32,
    fm_mod_ratio: f32,
    fm_mod_level: f32,
    fm_car_ratio: f32,
    pluck_damping: f32,
}

impl Default for SynthConfig {
    fn default() -> Self {
        SynthConfig {
            oscillator_type: KIND_SAW,
            oscillator_detune: 0.0,
            filter_cutoff: 8000.0,
            filter_resonance: 0.1,
            amp_env_attack: 0.01,
            amp_env_decay: 0.1,
            amp_env_sustain: 0.7,
            amp_env_release: 0.3,
            volume: 0.5,
            polyphony: 8,
            pitch_env_amount: 0.0,
            pitch_env_attack: 0.0,
            lfo_rate: 0.0,
            lfo_depth: 0.0,
            lfo_target: TARGET_NONE,
            fm_mod_ratio: 1.0,
            fm_mod_level: 0.0,
            fm_car_ratio: 1.0,
            pluck_damping: 0.5,
        }
    }
}

fn midi_to_freq(note: f32) -> f32 {
    440.0 * 2.0_f32.powf((note - 69.0) / 12.0)
}

struct Voice {
    active: bool,
    released: bool,
    note: u32,
    velocity: f32,
    age: u32,
    elapsed: f32,
    lfo_phase: f32,
    oscillator: Oscillator,
    adsr: AdsrEnvelope,
    filter_handle: u32,
}

impl Voice {
    fn new(sample_rate: f32, config: &SynthConfig, seed: u32) -> Voice {
        Voice {
            active: false,
            released: false,
            note: 0,
            velocity: 0.0,
            age: 0,
            elapsed: 0.0,
            lfo_phase: 0.0,
            oscillator: Oscillator::new(config.oscillator_type, sample_rate, seed),
            adsr: AdsrEnvelope::new(0.0, 0.0, 0.0, 0.0),
            filter_handle: biquad_set(
                sample_rate,
                0,
                config.filter_cutoff,
                config.filter_resonance,
                0.0,
            ),
        }
    }
}

#[wasm_bindgen]
pub struct PolySynth {
    sample_rate: f32,
    config: SynthConfig,
    voices: Vec<Voice>,
    age_counter: u32,
}

#[wasm_bindgen]
impl PolySynth {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, polyphony: u32) -> PolySynth {
        let mut config = SynthConfig::default();
        config.polyphony = (polyphony.max(1)) as usize;
        let voices = (0..config.polyphony)
            .map(|_| Voice::new(sample_rate, &config, 1))
            .collect();
        PolySynth {
            sample_rate,
            config,
            voices,
            age_counter: 0,
        }
    }

    pub fn set_oscillator_type(&mut self, kind: u32) {
        if self.config.oscillator_type == kind {
            return;
        }
        self.config.oscillator_type = kind;
        for voice in &mut self.voices {
            biquad_free(voice.filter_handle);
            voice.oscillator = Oscillator::new(
                self.config.oscillator_type,
                self.sample_rate,
                voice.age.max(1),
            );
            voice.filter_handle = biquad_set(
                self.sample_rate,
                0,
                self.config.filter_cutoff,
                self.config.filter_resonance,
                0.0,
            );
        }
    }

    pub fn set_oscillator_detune(&mut self, value: f32) {
        self.config.oscillator_detune = value;
    }

    pub fn set_filter_cutoff(&mut self, value: f32) {
        self.config.filter_cutoff = value.clamp(20.0, self.sample_rate * 0.49);
    }

    pub fn set_filter_resonance(&mut self, value: f32) {
        self.config.filter_resonance = value;
    }

    pub fn set_amp_env(&mut self, attack: f32, decay: f32, sustain: f32, release: f32) {
        self.config.amp_env_attack = attack.max(0.0);
        self.config.amp_env_decay = decay.max(0.0);
        self.config.amp_env_sustain = sustain.clamp(0.0, 1.0);
        self.config.amp_env_release = release.max(0.0);
    }

    pub fn set_volume(&mut self, value: f32) {
        self.config.volume = value.clamp(0.0, 2.0);
    }

    pub fn set_pitch_env(&mut self, amount: f32, attack: f32) {
        self.config.pitch_env_amount = amount;
        self.config.pitch_env_attack = attack.max(0.0);
    }

    pub fn set_lfo(&mut self, rate: f32, depth: f32, target: u32) {
        self.config.lfo_rate = rate.max(0.0);
        self.config.lfo_depth = depth.max(0.0);
        self.config.lfo_target = if target <= TARGET_VOLUME { target } else { TARGET_NONE };
    }

    pub fn set_fm(&mut self, mod_ratio: f32, mod_level: f32, car_ratio: f32) {
        self.config.fm_mod_ratio = mod_ratio;
        self.config.fm_mod_level = mod_level;
        self.config.fm_car_ratio = car_ratio;
    }

    pub fn set_pluck_damping(&mut self, value: f32) {
        self.config.pluck_damping = value;
    }

    pub fn note_on(&mut self, note: f32, velocity: f32) {
        self.age_counter = self.age_counter.wrapping_add(1);
        let index = self.allocate_index();
        let osc_type = self.config.oscillator_type;
        let sr = self.sample_rate;
        let seed = self.age_counter.wrapping_mul(0x9E37_79B9);
        let attack = self.config.amp_env_attack;
        let decay = self.config.amp_env_decay;
        let sustain = self.config.amp_env_sustain;
        let release = self.config.amp_env_release;
        let cutoff = self.config.filter_cutoff;
        let resonance = self.config.filter_resonance;
        let voice = &mut self.voices[index];
        voice.note = note.round().clamp(0.0, 127.0) as u32;
        voice.velocity = velocity.round().clamp(0.0, 127.0) / 127.0;
        voice.age = self.age_counter;
        voice.active = true;
        voice.released = false;
        voice.elapsed = 0.0;
        voice.lfo_phase = 0.0;
        voice.oscillator = Oscillator::new(osc_type, sr, seed);
        voice.adsr = AdsrEnvelope::new(attack, decay, sustain, release);
        voice.adsr.note_on();
        biquad_free(voice.filter_handle);
        voice.filter_handle = biquad_set(sr, 0, cutoff, resonance, 0.0);
    }

    pub fn note_off(&mut self, note: f32) {
        for voice in &mut self.voices {
            if voice.active && !voice.released && voice.note == note as u32 {
                voice.released = true;
                voice.adsr.note_off();
            }
        }
    }

    pub fn all_notes_off(&mut self) {
        for voice in &mut self.voices {
            if voice.active {
                voice.released = true;
                voice.adsr.note_off();
            }
        }
    }

    pub fn active_voices(&self) -> u32 {
        self.voices.iter().filter(|v| v.active).count() as u32
    }

    pub fn is_active(&self) -> bool {
        self.voices
            .iter()
            .any(|v| v.active && !v.adsr.is_finished())
    }

    pub fn process_sample(&mut self) -> f32 {
        let dt = 1.0 / self.sample_rate;
        let detune = 2.0_f32.powf(self.config.oscillator_detune / 1200.0);
        let mut sum = 0.0;
        for voice in &mut self.voices {
            if !voice.active {
                continue;
            }
            let mut pitch_offset = 0.0;
            if self.config.pitch_env_amount != 0.0
                && self.config.pitch_env_attack > 0.0
                && voice.elapsed < self.config.pitch_env_attack
            {
                let t = voice.elapsed / self.config.pitch_env_attack;
                pitch_offset = self.config.pitch_env_amount * (1.0 - t);
            }
            voice.elapsed += dt;

            let mut lfo_val = 0.0;
            if self.config.lfo_rate > 0.0 && self.config.lfo_depth > 0.0 {
                voice.lfo_phase += self.config.lfo_rate * dt * TAU;
                lfo_val = voice.lfo_phase.sin() * self.config.lfo_depth;
            }

            let mut freq = midi_to_freq(voice.note as f32 + pitch_offset) * detune;
            if self.config.lfo_target == TARGET_PITCH {
                freq *= 1.0 + lfo_val * 0.05;
            }

            let raw = voice.oscillator.process(
                freq,
                self.config.fm_mod_ratio,
                self.config.fm_mod_level,
                self.config.fm_car_ratio,
                self.config.pluck_damping,
            );

            let mut filtered = biquad_process(voice.filter_handle, raw);
            if self.config.lfo_target == TARGET_FILTER {
                filtered *= 1.0 + lfo_val * 0.5;
            }

            let mut amp = voice.adsr.process(dt);
            if self.config.lfo_target == TARGET_VOLUME {
                amp *= (1.0 + lfo_val).max(0.0);
            }

            sum += filtered * amp * voice.velocity * self.config.volume;

            if voice.adsr.is_finished() {
                voice.active = false;
            }
        }
        sum.clamp(-1.0, 1.0)
    }

    pub fn process_block(&mut self, num_samples: u32) -> Vec<f32> {
        let count = num_samples as usize;
        let mut buffer = vec![0.0f32; count * 2];
        for i in 0..count {
            let sample = self.process_sample();
            buffer[i * 2] = sample;
            buffer[i * 2 + 1] = sample;
        }
        buffer
    }

    fn allocate_index(&mut self) -> usize {
        if let Some(free) = self.voices.iter().position(|v| !v.active) {
            return free;
        }
        let mut oldest = 0usize;
        for i in 1..self.voices.len() {
            if self.voices[i].age < self.voices[oldest].age {
                oldest = i;
            }
        }
        oldest
    }
}

impl Drop for PolySynth {
    fn drop(&mut self) {
        for voice in &self.voices {
            biquad_free(voice.filter_handle);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48000.0;

    #[test]
    fn new_uses_defaults() {
        let synth = PolySynth::new(SR, 8);
        assert_eq!(synth.config.oscillator_type, KIND_SAW);
        assert_eq!(synth.config.polyphony, 8);
        assert_eq!(synth.active_voices(), 0);
        assert!(!synth.is_active());
    }

    #[test]
    fn note_on_produces_audio() {
        let mut synth = PolySynth::new(SR, 8);
        synth.note_on(69.0, 100.0);
        assert_eq!(synth.active_voices(), 1);
        assert!(synth.is_active());
        let samples: Vec<f32> = (0..480).map(|_| synth.process_sample()).collect();
        assert!(samples.iter().any(|&s| s != 0.0), "no audio produced");
    }

    #[test]
    fn process_block_returns_interleaved_stereo() {
        let mut synth = PolySynth::new(SR, 8);
        synth.note_on(69.0, 100.0);
        let block = synth.process_block(64);
        assert_eq!(block.len(), 128);
        assert!(block.iter().any(|&s| s != 0.0), "block must contain audio");
        for i in 0..64 {
            assert_eq!(block[i * 2], block[i * 2 + 1]);
        }
    }

    #[test]
    fn note_off_releases_voice() {
        let mut synth = PolySynth::new(SR, 8);
        synth.note_on(69.0, 100.0);
        for _ in 0..100 {
            synth.process_sample();
        }
        synth.note_off(69.0);
        for _ in 0..20000 {
            synth.process_sample();
        }
        let mut max_tail = 0.0f32;
        for _ in 0..480 {
            max_tail = max_tail.max(synth.process_sample().abs());
        }
        assert!(max_tail < 0.001, "release did not decay, tail={}", max_tail);
    }

    #[test]
    fn polyphony_respects_max_voices() {
        let mut synth = PolySynth::new(SR, 8);
        for i in 0..20 {
            synth.note_on(60.0 + (i % 12) as f32, 100.0);
        }
        assert_eq!(synth.active_voices(), 8);
    }

    #[test]
    fn all_notes_off_silences() {
        let mut synth = PolySynth::new(SR, 8);
        synth.note_on(60.0, 100.0);
        synth.note_on(64.0, 100.0);
        synth.note_on(67.0, 100.0);
        synth.all_notes_off();
        for _ in 0..30000 {
            synth.process_sample();
        }
        assert!(!synth.is_active());
    }

    #[test]
    fn set_oscillator_type_changes_wave() {
        let mut synth = PolySynth::new(SR, 8);
        synth.set_oscillator_type(0);
        assert_eq!(synth.config.oscillator_type, 0);
    }

    #[test]
    fn setters_update_config() {
        let mut synth = PolySynth::new(SR, 8);
        synth.set_filter_cutoff(4000.0);
        synth.set_volume(0.7);
        synth.set_amp_env(0.02, 0.2, 0.6, 0.4);
        synth.set_fm(4.0, 0.5, 1.0);
        synth.set_lfo(3.0, 0.2, 1);
        assert_eq!(synth.config.filter_cutoff, 4000.0);
        assert_eq!(synth.config.volume, 0.7);
        assert_eq!(synth.config.amp_env_attack, 0.02);
        assert_eq!(synth.config.fm_mod_ratio, 4.0);
        assert_eq!(synth.config.lfo_target, 1);
    }

    #[test]
    fn note_repeated_cycles_no_panic() {
        let mut synth = PolySynth::new(SR, 8);
        for i in 0..40 {
            let note = 60.0 + (i % 12) as f32;
            synth.note_on(note, 100.0);
            synth.process_sample();
            synth.note_off(note);
        }
        for _ in 0..50000 {
            synth.process_sample();
        }
        assert!(!synth.is_active());
    }

    #[test]
    fn deterministic_with_same_sequence() {
        let mut a = PolySynth::new(SR, 8);
        let mut b = PolySynth::new(SR, 8);
        a.set_oscillator_type(4);
        b.set_oscillator_type(4);
        a.note_on(60.0, 100.0);
        b.note_on(60.0, 100.0);
        for _ in 0..64 {
            assert_eq!(a.process_sample().to_bits(), b.process_sample().to_bits());
        }
    }
}
