use wasm_bindgen::prelude::*;

const MAX_VOICES: usize = 8;
const ATTACK_TIME: f32 = 0.01;
const DECAY_TIME: f32 = 0.1;
const RELEASE_TIME: f32 = 0.2;

struct Voice {
    on: bool,
    released: bool,
    note: u32,
    velocity: f32,
    position: f32,
    age: u32,
    env_level: f32,
    env_state: u8,
    env_time: f32,
    env_release_level: f32,
}

impl Voice {
    fn new() -> Voice {
        Voice {
            on: false,
            released: false,
            note: 60,
            velocity: 0.0,
            position: 0.0,
            age: 0,
            env_level: 0.0,
            env_state: 0,
            env_time: 0.0,
            env_release_level: 0.0,
        }
    }
}

#[wasm_bindgen]
pub struct Sampler {
    sample_rate: f32,
    buffer: Vec<f32>,
    buffer_sample_rate: f32,
    root_note: u32,
    volume: f32,
    voices: Vec<Voice>,
    age_counter: u32,
}

#[wasm_bindgen]
impl Sampler {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Sampler {
        let voices = (0..MAX_VOICES).map(|_| Voice::new()).collect();
        Sampler {
            sample_rate,
            buffer: Vec::new(),
            buffer_sample_rate: sample_rate,
            root_note: 60,
            volume: 0.5,
            voices,
            age_counter: 0,
        }
    }

    pub fn set_sample(&mut self, buffer: &[f32], buffer_sample_rate: f32, root_note: u32) {
        self.buffer = buffer.to_vec();
        self.buffer_sample_rate = buffer_sample_rate;
        self.root_note = root_note;
    }

    pub fn set_config(&mut self, config_json: &str) {
        let volume = serde_json::from_str::<serde_json::Value>(config_json)
            .ok()
            .and_then(|v| v.get("volume").and_then(|x| x.as_f64()))
            .unwrap_or(0.5);
        self.volume = volume.clamp(0.0, 2.0) as f32;
    }

    pub fn has_sample(&self) -> bool {
        !self.buffer.is_empty()
    }

    pub fn active_voices(&self) -> u32 {
        self.voices.iter().filter(|v| v.on).count() as u32
    }

    pub fn note_on(&mut self, note: f32, velocity: f32) {
        if self.buffer.is_empty() {
            return;
        }
        self.age_counter = self.age_counter.wrapping_add(1);
        let index = self.allocate_index();
        let voice = &mut self.voices[index];
        voice.note = note.round().clamp(0.0, 127.0) as u32;
        voice.velocity = velocity.round().clamp(0.0, 127.0) / 127.0;
        voice.position = 0.0;
        voice.on = true;
        voice.released = false;
        voice.age = self.age_counter;
        voice.env_level = 0.0;
        voice.env_state = 1;
        voice.env_time = 0.0;
    }

    pub fn note_off(&mut self, note: f32) {
        let n = note as u32;
        for voice in &mut self.voices {
            if voice.on && voice.note == n && !voice.released {
                voice.released = true;
                voice.env_release_level = voice.env_level;
                voice.env_state = 4;
                voice.env_time = 0.0;
            }
        }
    }

    pub fn all_notes_off(&mut self) {
        for voice in &mut self.voices {
            if voice.on {
                voice.released = true;
                voice.env_release_level = voice.env_level;
                voice.env_state = 4;
                voice.env_time = 0.0;
            }
        }
    }

    pub fn process_sample(&mut self) -> f32 {
        let dt = 1.0 / self.sample_rate;
        let mut sum = 0.0;
        for voice in &mut self.voices {
            if !voice.on {
                continue;
            }
            if self.buffer.is_empty() || voice.position >= self.buffer.len() as f32 {
                voice.on = false;
                continue;
            }
            let ratio = 2.0_f32.powf((voice.note as f32 - self.root_note as f32) / 12.0)
                * (self.sample_rate / self.buffer_sample_rate);
            let idx = voice.position.floor();
            let frac = voice.position - idx;
            let i = idx as usize;
            let next = (i + 1).min(self.buffer.len() - 1);
            let sample = self.buffer[i] + frac * (self.buffer[next] - self.buffer[i]);

            match voice.env_state {
                1 => {
                    voice.env_time += dt;
                    if voice.env_time >= ATTACK_TIME {
                        voice.env_level = 1.0;
                        voice.env_state = 2;
                        voice.env_time = 0.0;
                    } else {
                        voice.env_level = voice.env_time / ATTACK_TIME;
                    }
                }
                2 => {
                    voice.env_time += dt;
                    if voice.env_time >= DECAY_TIME {
                        voice.env_level = 1.0;
                        voice.env_state = 3;
                    } else {
                        voice.env_level = voice.env_time / DECAY_TIME;
                    }
                }
                3 => {
                    voice.env_level = 1.0;
                }
                4 => {
                    voice.env_time += dt;
                    if voice.env_time >= RELEASE_TIME {
                        voice.env_level = 0.0;
                        voice.on = false;
                    } else {
                        voice.env_level =
                            voice.env_release_level * (1.0 - voice.env_time / RELEASE_TIME);
                    }
                }
                _ => {}
            }

            sum += sample * voice.env_level * voice.velocity * self.volume;
            voice.position += ratio;
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
        if let Some(free) = self.voices.iter().position(|v| !v.on) {
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

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48000.0;

    fn impulse() -> Vec<f32> {
        let mut buf = vec![0.0f32; 4800];
        buf[0] = 1.0;
        buf
    }

    fn ramp() -> Vec<f32> {
        (0..4800).map(|i| i as f32 / 4800.0).collect()
    }

    fn dc() -> Vec<f32> {
        vec![1.0f32; 4800]
    }

    #[test]
    fn new_sampler_has_no_sample() {
        let sampler = Sampler::new(SR);
        assert!(!sampler.has_sample());
        assert_eq!(sampler.active_voices(), 0);
    }

    #[test]
    fn note_on_plays_impulse() {
        let mut sampler = Sampler::new(SR);
        sampler.set_sample(&impulse(), SR, 60);
        sampler.note_on(60.0, 100.0);
        assert_eq!(sampler.active_voices(), 1);
        let samples: Vec<f32> = (0..4800).map(|_| sampler.process_sample()).collect();
        assert!(samples.iter().any(|&s| s.abs() > 0.0), "no audio produced");
    }

    #[test]
    fn higher_note_plays_faster() {
        let mut low = Sampler::new(SR);
        low.set_sample(&ramp(), SR, 60);
        low.note_on(60.0, 100.0);
        let mut high = Sampler::new(SR);
        high.set_sample(&ramp(), SR, 60);
        high.note_on(72.0, 100.0);

        let mut low_val = 0.0;
        let mut high_val = 0.0;
        for _ in 0..1200 {
            low_val = low.process_sample();
            high_val = high.process_sample();
        }
        assert!(
            high_val > low_val,
            "higher note should advance further into the ramp, low={} high={}",
            low_val,
            high_val
        );
    }

    #[test]
    fn note_off_releases_voice() {
        let mut sampler = Sampler::new(SR);
        sampler.set_sample(&impulse(), SR, 60);
        sampler.note_on(60.0, 100.0);
        for _ in 0..100 {
            sampler.process_sample();
        }
        sampler.note_off(60.0);
        for _ in 0..4800 {
            sampler.process_sample();
        }
        let mut tail = 0.0f32;
        for _ in 0..480 {
            tail = tail.max(sampler.process_sample().abs());
        }
        assert!(tail < 0.001, "release did not decay, tail={}", tail);
    }

    #[test]
    fn all_notes_off_silences() {
        let mut sampler = Sampler::new(SR);
        sampler.set_sample(&impulse(), SR, 60);
        sampler.note_on(60.0, 100.0);
        sampler.note_on(64.0, 100.0);
        sampler.all_notes_off();
        for _ in 0..30000 {
            sampler.process_sample();
        }
        assert_eq!(sampler.active_voices(), 0);
    }

    #[test]
    fn no_sample_means_no_audio() {
        let mut sampler = Sampler::new(SR);
        sampler.note_on(60.0, 100.0);
        assert_eq!(sampler.active_voices(), 0);
        assert_eq!(sampler.process_sample(), 0.0);
    }

    #[test]
    fn polyphony_limited_to_max_voices() {
        let mut sampler = Sampler::new(SR);
        sampler.set_sample(&impulse(), SR, 60);
        for i in 0..20 {
            sampler.note_on(60.0 + (i % 24) as f32, 100.0);
        }
        assert_eq!(sampler.active_voices(), MAX_VOICES as u32);
    }

    #[test]
    fn process_block_returns_interleaved() {
        let mut sampler = Sampler::new(SR);
        sampler.set_sample(&impulse(), SR, 60);
        sampler.note_on(60.0, 100.0);
        let block = sampler.process_block(64);
        assert_eq!(block.len(), 128);
        for i in 0..64 {
            assert_eq!(block[i * 2], block[i * 2 + 1]);
        }
    }

    #[test]
    fn set_config_volume() {
        let mut sampler = Sampler::new(SR);
        sampler.set_config(r#"{"volume":1}"#);
        sampler.set_sample(&dc(), SR, 60);
        sampler.note_on(60.0, 127.0);
        let mut peak = 0.0f32;
        for _ in 0..4800 {
            peak = peak.max(sampler.process_sample().abs());
        }
        assert!(peak > 0.9, "volume 1 should be loud, peak={}", peak);
    }
}
