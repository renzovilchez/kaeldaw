use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use crate::adsr::AdsrEnvelope;
use crate::biquad::{biquad_free, biquad_process, biquad_set};
use crate::osc::Oscillator;

const TAU: f32 = 2.0 * std::f32::consts::PI;
const KIND_SAW: u32 = 1;

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SynthConfig {
    #[serde(default = "default_osc_type")]
    pub oscillator_type: u32,
    #[serde(default)]
    pub oscillator_detune: f32,
    #[serde(default = "default_cutoff")]
    pub filter_cutoff: f32,
    #[serde(default = "default_resonance")]
    pub filter_resonance: f32,
    #[serde(default = "default_attack")]
    pub amp_env_attack: f32,
    #[serde(default = "default_decay")]
    pub amp_env_decay: f32,
    #[serde(default = "default_sustain")]
    pub amp_env_sustain: f32,
    #[serde(default = "default_release")]
    pub amp_env_release: f32,
    #[serde(default = "default_volume")]
    pub volume: f32,
    #[serde(default = "default_polyphony")]
    pub polyphony: usize,
    #[serde(default)]
    pub pitch_env_amount: f32,
    #[serde(default)]
    pub pitch_env_attack: f32,
    #[serde(default)]
    pub lfo_rate: f32,
    #[serde(default)]
    pub lfo_depth: f32,
    #[serde(default = "default_lfo_target")]
    pub lfo_target: String,
    #[serde(default = "default_ratio")]
    pub fm_mod_ratio: f32,
    #[serde(default)]
    pub fm_mod_level: f32,
    #[serde(default = "default_ratio")]
    pub fm_car_ratio: f32,
    #[serde(default = "default_pluck_damping")]
    pub pluck_damping: f32,
}

fn default_osc_type() -> u32 {
    KIND_SAW
}
fn default_cutoff() -> f32 {
    8000.0
}
fn default_resonance() -> f32 {
    0.1
}
fn default_attack() -> f32 {
    0.01
}
fn default_decay() -> f32 {
    0.1
}
fn default_sustain() -> f32 {
    0.7
}
fn default_release() -> f32 {
    0.3
}
fn default_volume() -> f32 {
    0.5
}
fn default_polyphony() -> usize {
    8
}
fn default_lfo_target() -> String {
    "none".to_string()
}
fn default_ratio() -> f32 {
    1.0
}
fn default_pluck_damping() -> f32 {
    0.5
}

impl Default for SynthConfig {
    fn default() -> Self {
        SynthConfig {
            oscillator_type: default_osc_type(),
            oscillator_detune: 0.0,
            filter_cutoff: default_cutoff(),
            filter_resonance: default_resonance(),
            amp_env_attack: default_attack(),
            amp_env_decay: default_decay(),
            amp_env_sustain: default_sustain(),
            amp_env_release: default_release(),
            volume: default_volume(),
            polyphony: default_polyphony(),
            pitch_env_amount: 0.0,
            pitch_env_attack: 0.0,
            lfo_rate: 0.0,
            lfo_depth: 0.0,
            lfo_target: default_lfo_target(),
            fm_mod_ratio: default_ratio(),
            fm_mod_level: 0.0,
            fm_car_ratio: default_ratio(),
            pluck_damping: default_pluck_damping(),
        }
    }
}

fn parse_config(json: &str) -> SynthConfig {
    serde_json::from_str(json).unwrap_or_default()
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
    pub fn new(sample_rate: f32, config_json: &str) -> PolySynth {
        let config = parse_config(config_json);
        let polyphony = config.polyphony.max(1);
        let voices = (0..polyphony)
            .map(|_| Voice::new(sample_rate, &config, 1))
            .collect();
        PolySynth {
            sample_rate,
            config,
            voices,
            age_counter: 0,
        }
    }

    pub fn set_config(&mut self, config_json: &str) {
        let next = parse_config(config_json);
        let type_changed = next.oscillator_type != self.config.oscillator_type;
        let cutoff_changed = next.filter_cutoff != self.config.filter_cutoff
            || next.filter_resonance != self.config.filter_resonance;
        self.config = next;
        for voice in &mut self.voices {
            if type_changed {
                voice.oscillator = Oscillator::new(
                    self.config.oscillator_type,
                    self.sample_rate,
                    voice.age.max(1),
                );
            }
            if type_changed || (cutoff_changed && voice.active) {
                biquad_free(voice.filter_handle);
                voice.filter_handle = biquad_set(
                    self.sample_rate,
                    0,
                    self.config.filter_cutoff,
                    self.config.filter_resonance,
                    0.0,
                );
            }
        }
    }

    pub fn get_config(&self) -> String {
        serde_json::to_string(&self.config).unwrap_or_default()
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
            if self.config.lfo_target == "pitch" {
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
            if self.config.lfo_target == "filter" {
                filtered *= 1.0 + lfo_val * 0.5;
            }

            let mut amp = voice.adsr.process(dt);
            if self.config.lfo_target == "volume" {
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
        let count = num_samples.max(0) as usize;
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
    fn new_with_empty_config_uses_defaults() {
        let synth = PolySynth::new(SR, "{}");
        assert_eq!(synth.config.oscillator_type, KIND_SAW);
        assert_eq!(synth.config.polyphony, 8);
        assert_eq!(synth.active_voices(), 0);
        assert!(!synth.is_active());
    }

    #[test]
    fn new_with_custom_config() {
        let synth = PolySynth::new(SR, r#"{"oscillatorType":2,"polyphony":4}"#);
        assert_eq!(synth.config.oscillator_type, 2);
        assert_eq!(synth.config.polyphony, 4);
        assert_eq!(synth.voices.len(), 4);
    }

    #[test]
    fn invalid_config_falls_back_to_default() {
        let synth = PolySynth::new(SR, "not json");
        assert_eq!(synth.config.oscillator_type, KIND_SAW);
    }

    #[test]
    fn note_on_produces_audio() {
        let mut synth = PolySynth::new(SR, "{}");
        synth.note_on(69.0, 100.0);
        assert_eq!(synth.active_voices(), 1);
        assert!(synth.is_active());
        let samples: Vec<f32> = (0..480).map(|_| synth.process_sample()).collect();
        assert!(samples.iter().any(|&s| s != 0.0), "no audio produced");
    }

    #[test]
    fn process_block_returns_interleaved_stereo() {
        let mut synth = PolySynth::new(SR, "{}");
        synth.note_on(69.0, 100.0);
        let block = synth.process_block(64);
        assert_eq!(block.len(), 128);
        assert!(
            block.iter().any(|&s| s != 0.0),
            "block must contain audio"
        );
        for i in 0..64 {
            assert_eq!(
                block[i * 2], block[i * 2 + 1],
                "mono synth must be duplicated to stereo"
            );
        }
    }

    #[test]
    fn note_off_releases_voice() {
        let mut synth = PolySynth::new(SR, "{}");
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
            let s = synth.process_sample();
            max_tail = max_tail.max(s.abs());
        }
        assert!(max_tail < 0.001, "release did not decay, tail={}", max_tail);
    }

    #[test]
    fn polyphony_respects_max_voices() {
        let mut synth = PolySynth::new(SR, r#"{"polyphony":4}"#);
        for i in 0..8 {
            synth.note_on(60.0 + i as f32, 100.0);
        }
        assert_eq!(synth.active_voices(), 4);
    }

    #[test]
    fn all_notes_off_silences() {
        let mut synth = PolySynth::new(SR, "{}");
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
    fn set_config_updates_type() {
        let mut synth = PolySynth::new(SR, "{}");
        synth.set_config(r#"{"oscillatorType":0}"#);
        assert_eq!(synth.config.oscillator_type, 0);
    }

    #[test]
    fn note_repeated_cycles_no_panic() {
        let mut synth = PolySynth::new(SR, "{}");
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
    fn deterministic_with_same_seed_sequence() {
        let mut a = PolySynth::new(SR, r#"{"oscillatorType":4}"#);
        let mut b = PolySynth::new(SR, r#"{"oscillatorType":4}"#);
        a.note_on(60.0, 100.0);
        b.note_on(60.0, 100.0);
        for _ in 0..64 {
            assert_eq!(a.process_sample().to_bits(), b.process_sample().to_bits());
        }
    }
}
