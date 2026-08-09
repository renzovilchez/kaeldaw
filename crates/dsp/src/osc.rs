use std::sync::OnceLock;
use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

const TABLE_SIZE: usize = 4096;
const TAU: f32 = 2.0 * PI;
type Table = Vec<f32>;

const SAW_HARMONICS: [u32; 10] = [512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
const SQUARE_HARMONICS: [u32; 9] = [511, 255, 127, 63, 31, 15, 7, 3, 1];

fn read_table(table: &Table, phase: f32) -> f32 {
    let pos = phase * TABLE_SIZE as f32;
    let i = pos as usize;
    let frac = pos - i as f32;
    let next = if i + 1 < TABLE_SIZE { i + 1 } else { 0 };
    table[i] + frac * (table[next] - table[i])
}

static SAW_TABLES: OnceLock<Vec<Table>> = OnceLock::new();
static SQUARE_TABLES: OnceLock<Vec<Table>> = OnceLock::new();

fn generate_saw_table(harmonics: u32) -> Table {
    let mut t = vec![0.0f32; TABLE_SIZE];
    for i in 0..TABLE_SIZE {
        let x = i as f32 / TABLE_SIZE as f32;
        let mut sum = 0.0f32;
        for k in 1..=harmonics {
            let phase = 2.0 * PI * k as f32 * x;
            sum += phase.sin() / k as f32;
        }
        t[i] = sum * (-2.0 / PI);
    }
    t
}

fn generate_square_table(harmonics: u32) -> Table {
    let mut t = vec![0.0f32; TABLE_SIZE];
    for i in 0..TABLE_SIZE {
        let x = i as f32 / TABLE_SIZE as f32;
        let mut sum = 0.0f32;
        let mut k: u32 = 1;
        while k <= harmonics {
            let phase = 2.0 * PI * k as f32 * x;
            sum += phase.sin() / k as f32;
            k += 2;
        }
        t[i] = sum * (4.0 / PI);
    }
    t
}

fn saw_tables() -> &'static Vec<Table> {
    SAW_TABLES.get_or_init(|| {
        let harmonics = [512u32, 256, 128, 64, 32, 16, 8, 4, 2, 1];
        harmonics.iter().map(|&h| generate_saw_table(h)).collect()
    })
}

fn square_tables() -> &'static Vec<Table> {
    SQUARE_TABLES.get_or_init(|| {
        let harmonics = [511u32, 255, 127, 63, 31, 15, 7, 3, 1];
        harmonics.iter().map(|&h| generate_square_table(h)).collect()
    })
}

fn pick_table_idx(harmonic_counts: &[u32], freq: f32, sample_rate: f32) -> usize {
    if freq <= 0.0 { return harmonic_counts.len() - 1; }
    let max_h = (sample_rate / 2.0 / freq) as u32;
    for (i, &h) in harmonic_counts.iter().enumerate() {
        if h <= max_h { return i; }
    }
    harmonic_counts.len() - 1
}

// Table indices from lowest harmonics (index 0) to highest:
// saw:  [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]
// square: [1, 3, 7, 15, 31, 63, 127, 255, 511]
// pick_table_idx returns the first index where h <= max_h,
// so for low freq it picks early index (high harmonics)
// and for high freq it picks later index (low harmonics).
// The tables are stored in ascending harmonic order.

#[wasm_bindgen]
pub struct BandlimitedSaw {
    phase: f32,
    harmonic_counts: Vec<u32>,
    sample_rate: f32,
}

#[wasm_bindgen]
impl BandlimitedSaw {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Self {
        let harmonic_counts = SAW_HARMONICS.to_vec();
        // Trigger table generation once (lazy)
        saw_tables();
        Self { phase: 0.0, harmonic_counts, sample_rate }
    }

    pub fn process(&mut self, frequency: f32) -> f32 {
        if frequency <= 0.0 || self.sample_rate <= 0.0 { return 0.0; }
        let inc = frequency / self.sample_rate;

        let idx = pick_table_idx(&self.harmonic_counts, frequency, self.sample_rate);
        let table = &saw_tables()[idx];
        let out = read_table(table, self.phase);

        self.phase = (self.phase + inc) % 1.0;
        out
    }

    pub fn reset(&mut self) { self.phase = 0.0; }
    pub fn get_phase(&self) -> f32 { self.phase % 1.0 }
}

#[wasm_bindgen]
pub struct BandlimitedSquare {
    phase: f32,
    harmonic_counts: Vec<u32>,
    sample_rate: f32,
}

#[wasm_bindgen]
impl BandlimitedSquare {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Self {
        let harmonic_counts = SQUARE_HARMONICS.to_vec();
        square_tables();
        Self { phase: 0.0, harmonic_counts, sample_rate }
    }

    pub fn process(&mut self, frequency: f32) -> f32 {
        if frequency <= 0.0 || self.sample_rate <= 0.0 { return 0.0; }
        let inc = frequency / self.sample_rate;

        let idx = pick_table_idx(&self.harmonic_counts, frequency, self.sample_rate);
        let table = &square_tables()[idx];
        let out = read_table(table, self.phase);

        self.phase = (self.phase + inc) % 1.0;
        out
    }

    pub fn reset(&mut self) { self.phase = 0.0; }
    pub fn get_phase(&self) -> f32 { self.phase % 1.0 }
}

#[derive(Clone, Copy, PartialEq)]
enum OscKind {
    Sine,
    Saw,
    Square,
    Triangle,
    Noise,
    Fm,
    Pluck,
}

const KIND_SINE: u32 = 0;
const KIND_SAW: u32 = 1;
const KIND_SQUARE: u32 = 2;
const KIND_TRIANGLE: u32 = 3;
const KIND_NOISE: u32 = 4;
const KIND_FM: u32 = 5;
const KIND_PLUCK: u32 = 6;

impl OscKind {
    fn from_u32(kind: u32) -> OscKind {
        match kind {
            KIND_SINE => OscKind::Sine,
            KIND_SQUARE => OscKind::Square,
            KIND_TRIANGLE => OscKind::Triangle,
            KIND_NOISE => OscKind::Noise,
            KIND_FM => OscKind::Fm,
            KIND_PLUCK => OscKind::Pluck,
            _ => OscKind::Saw,
        }
    }
}

#[wasm_bindgen]
pub struct Oscillator {
    kind: OscKind,
    phase: f32,
    mod_phase: f32,
    sample_rate: f32,
    seed: u32,
    noise_state: u32,
    ks_buffer: Vec<f32>,
    ks_index: usize,
    ks_length: usize,
    ks_ready: bool,
}

#[wasm_bindgen]
impl Oscillator {
    #[wasm_bindgen(constructor)]
    pub fn new(kind: u32, sample_rate: f32, seed: u32) -> Oscillator {
        let seed = if seed == 0 { 0x9E37_79B9 } else { seed };
        Oscillator {
            kind: OscKind::from_u32(kind),
            phase: 0.0,
            mod_phase: 0.0,
            sample_rate,
            seed,
            noise_state: seed,
            ks_buffer: Vec::new(),
            ks_index: 0,
            ks_length: 0,
            ks_ready: false,
        }
    }

    pub fn process(
        &mut self,
        frequency: f32,
        mod_ratio: f32,
        mod_level: f32,
        car_ratio: f32,
        pluck_damping: f32,
    ) -> f32 {
        if frequency <= 0.0 || self.sample_rate <= 0.0 {
            return 0.0;
        }
        let sr = self.sample_rate;
        let inc = frequency / sr;
        match self.kind {
            OscKind::Sine => {
                let out = (TAU * self.phase).sin();
                self.phase = (self.phase + inc) % 1.0;
                out
            }
            OscKind::Saw => {
                let idx = pick_table_idx(&SAW_HARMONICS, frequency, sr);
                let out = read_table(&saw_tables()[idx], self.phase);
                self.phase = (self.phase + inc) % 1.0;
                out
            }
            OscKind::Square => {
                let idx = pick_table_idx(&SQUARE_HARMONICS, frequency, sr);
                let out = read_table(&square_tables()[idx], self.phase);
                self.phase = (self.phase + inc) % 1.0;
                out
            }
            OscKind::Triangle => {
                let out = 2.0 * (2.0 * self.phase - 1.0).abs() - 1.0;
                self.phase = (self.phase + inc) % 1.0;
                out
            }
            OscKind::Noise => self.next_random(),
            OscKind::Fm => {
                let mod_freq = frequency * mod_ratio;
                let mod_inc = mod_freq / sr;
                self.mod_phase = (self.mod_phase + mod_inc) % 1.0;
                let modulator = (TAU * self.mod_phase).sin() * mod_level * mod_freq;
                let car_inc = (frequency * car_ratio + modulator) / sr;
                self.phase = (self.phase + car_inc) % 1.0;
                (TAU * self.phase).sin()
            }
            OscKind::Pluck => {
                if !self.ks_ready {
                    let len = ((sr / frequency).round() as usize).max(2);
                    self.ks_buffer.reserve(len);
                    for _ in 0..len {
                        let sample = self.next_random();
                        self.ks_buffer.push(sample);
                    }
                    self.ks_length = len;
                    self.ks_index = 0;
                    self.ks_ready = true;
                }
                let idx = self.ks_index;
                let current = self.ks_buffer[idx];
                let next_idx = (idx + 1) % self.ks_length;
                let next_sample = self.ks_buffer[next_idx];
                let filtered = current + pluck_damping * (next_sample - current);
                self.ks_buffer[idx] = filtered * 0.996;
                self.ks_index = next_idx;
                current
            }
        }
    }

    pub fn reset(&mut self) {
        self.phase = 0.0;
        self.mod_phase = 0.0;
        self.ks_ready = false;
        self.ks_buffer.clear();
        self.noise_state = self.seed;
    }

    pub fn get_phase(&self) -> f32 {
        self.phase % 1.0
    }
}

impl Oscillator {
    fn next_random(&mut self) -> f32 {
        let mut x = self.noise_state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.noise_state = x;
        let v = x as f32 / u32::MAX as f32;
        v * 2.0 - 1.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn collect(samples: usize, freq: f32, osc: &mut dyn FnMut(f32) -> f32) -> Vec<f32> {
        (0..samples).map(|_| osc(freq)).collect()
    }

    #[test]
    fn saw_440hz_output_in_range() {
        let mut saw = BandlimitedSaw::new(48000.0);
        for _ in 0..480 {
            let v = saw.process(440.0);
            assert!(v >= -1.2 && v <= 1.2, "out of range: {}", v);
        }
    }

    #[test]
    fn saw_440hz_ramps_up() {
        let mut saw = BandlimitedSaw::new(48000.0);
        for _ in 0..20 { saw.process(440.0); }
        let v1 = saw.process(440.0);
        let v2 = saw.process(440.0);
        assert!(v2 > v1, "saw should ramp up, got {} -> {}", v1, v2);
    }

    #[test]
    fn saw_440hz_centered() {
        let mut saw = BandlimitedSaw::new(48000.0);
        let samples = collect(480, 440.0, &mut |f| saw.process(f));
        let max_v = samples.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        let min_v = samples.iter().cloned().fold(f32::INFINITY, f32::min);
        let center = (max_v + min_v) / 2.0;
        assert!(center.abs() < 0.15, "not centered: min={}, max={}", min_v, max_v);
    }

    #[test]
    fn saw_440hz_has_discontinuity() {
        let mut saw = BandlimitedSaw::new(48000.0);
        let n = (48000.0 / 440.0) as usize + 2;
        let samples = collect(n, 440.0, &mut |f| saw.process(f));
        let mut max_drop = 0.0f32;
        for i in 1..samples.len() {
            let drop = samples[i - 1] - samples[i];
            if drop > max_drop { max_drop = drop; }
        }
        assert!(max_drop > 0.8, "no saw discontinuity, max drop = {}", max_drop);
    }

    #[test]
    fn saw_different_frequencies_in_range() {
        for freq in [100.0, 220.0, 440.0, 880.0, 2000.0, 4000.0] {
            let mut saw = BandlimitedSaw::new(48000.0);
            for _ in 0..200 {
                let v = saw.process(freq);
                assert!(v >= -1.3 && v <= 1.3,
                    "freq {} out of range: {}", freq, v);
            }
        }
    }

    #[test]
    fn square_440hz_output_in_range() {
        let mut sqr = BandlimitedSquare::new(48000.0);
        for _ in 0..480 {
            let v = sqr.process(440.0);
            assert!(v >= -1.3 && v <= 1.3, "out of range: {}", v);
        }
    }

    #[test]
    fn square_440hz_both_polarities() {
        let mut sqr = BandlimitedSquare::new(48000.0);
        let samples = collect(480, 440.0, &mut |f| sqr.process(f));
        assert!(samples.iter().any(|&v| v > 0.5), "no positive samples");
        assert!(samples.iter().any(|&v| v < -0.5), "no negative samples");
    }

    #[test]
    fn square_higher_freq_still_binary() {
        let mut sqr = BandlimitedSquare::new(48000.0);
        for _ in 0..480 {
            let v = sqr.process(2000.0);
            assert!(v >= -1.3 && v <= 1.3);
        }
    }

    #[test]
    fn diag_table_selection() {
        let hc = [512u32, 256, 128, 64, 32, 16, 8, 4, 2, 1];
        for &freq in &[200.0, 440.0, 880.0, 2000.0, 4000.0] {
            let idx = pick_table_idx(&hc, freq, 48000.0);
            let h = hc[idx];
            let max_af = h as f32 * freq;
            println!("freq={} idx={} harmonics={} max_freq={:.0} nyq=24000 ok={}", freq, idx, h, max_af, max_af < 24000.0);
            assert!(max_af < 24000.0, "ALIASING at {}Hz table {}", freq, h);
        }
    }

    #[test]
    fn diag_saw_raw_output() {
        let mut saw = BandlimitedSaw::new(48000.0);
        let n = (48000.0 / 440.0) as usize;
        println!("--- Raw saw output 440Hz at 48kHz ({} samples) ---", n);
        for i in 0..n {
            let v = saw.process(440.0);
            if i < 10 || i > n - 10 {
                println!("s[{}] = {:.5}", i, v);
            }
        }
        // Verificar que ninguna muestra es NaN
        for _ in 0..480 {
            let v = saw.process(440.0);
            assert!(!v.is_nan(), "NaN at sample");
        }
    }

    #[test]
    fn diag_saw_sample_spacing() {
        let mut saw = BandlimitedSaw::new(48000.0);
        let samples: Vec<f32> = (0..109).map(|_| saw.process(440.0)).collect();
        // La rampa debe ser creciente en la mayor parte del ciclo
        let mut ascending = 0;
        let mut descending = 0;
        for i in 1..samples.len() {
            if samples[i] > samples[i - 1] { ascending += 1; }
            else if samples[i] < samples[i - 1] { descending += 1; }
        }
        println!("ascending={} descending={} total={}", ascending, descending, samples.len() - 1);
        assert!(ascending > 70, "expected >70 ascending, got {}", ascending);
        assert!(descending < 30, "expected <30 descending (Gibbs ringing), got {}", descending);
    }

    #[test]
    fn diag_counterwave() {
        let sr = 48000.0;
        let freq = 440.0;
        let mut saw = BandlimitedSaw::new(sr);
        // Use the SAME harmonics as the wavetable would at this frequency
        let hc = &saw.harmonic_counts;
        let idx = pick_table_idx(hc, freq, sr);
        let h = hc[idx];
        let n = (sr / freq) as usize;

        println!("--- Counterwave: wavetable vs ideal ({} harmonics, {} samples) ---", h, n);

        let mut max_diff = 0.0f32;
        let mut samples_over_001 = 0;
        for i in 0..n {
            let actual = saw.process(freq);

            let phase = i as f32 * freq / sr;
            let mut ideal = 0.0f32;
            for k in 1..=h {
                ideal += (2.0 * PI * k as f32 * phase).sin() / k as f32;
            }
            ideal *= -2.0 / PI;

            let diff = (actual - ideal).abs();
            if diff > max_diff { max_diff = diff; }
            if diff > 0.01 { samples_over_001 += 1; }
            if diff > 0.05 {
                println!("HIGH DIFF s[{}] actual={:.5} ideal={:.5} diff={:.5}", i, actual, ideal, diff);
            }
        }

        let pct = samples_over_001 as f32 / n as f32 * 100.0;
        println!("max_diff={:.5} samples_over_0.01={}/{} ({:.1}%)",
            max_diff, samples_over_001, n, pct);
        assert!(pct < 5.0, "More than 5% of samples differ from ideal by >0.01: {}%", pct);
    }

    fn osc_samples(osc: &mut Oscillator, count: usize, freq: f32) -> Vec<f32> {
        (0..count).map(|_| osc.process(freq, 4.76, 0.8, 1.0, 0.5)).collect()
    }

    #[test]
    fn unified_sine_in_range() {
        let mut osc = Oscillator::new(KIND_SINE, 48000.0, 1);
        for v in osc_samples(&mut osc, 480, 440.0) {
            assert!(v >= -1.0 && v <= 1.0, "sine out of range: {}", v);
        }
    }

    #[test]
    fn unified_saw_in_range() {
        let mut osc = Oscillator::new(KIND_SAW, 48000.0, 1);
        for v in osc_samples(&mut osc, 480, 440.0) {
            assert!(v >= -1.3 && v <= 1.3, "saw out of range: {}", v);
        }
    }

    #[test]
    fn unified_square_binary() {
        let mut osc = Oscillator::new(KIND_SQUARE, 48000.0, 1);
        let samples = osc_samples(&mut osc, 480, 440.0);
        assert!(samples.iter().any(|&v| v > 0.5), "no positive square samples");
        assert!(samples.iter().any(|&v| v < -0.5), "no negative square samples");
    }

    #[test]
    fn unified_triangle_shape() {
        let mut osc = Oscillator::new(KIND_TRIANGLE, 48000.0, 1);
        let samples = osc_samples(&mut osc, 480, 440.0);
        assert!(samples.iter().any(|&v| v > 0.9), "triangle should reach near +1");
        assert!(samples.iter().any(|&v| v < -0.9), "triangle should reach near -1");
    }

    #[test]
    fn unified_noise_deterministic_with_seed() {
        let mut a = Oscillator::new(KIND_NOISE, 48000.0, 42);
        let mut b = Oscillator::new(KIND_NOISE, 48000.0, 42);
        let mut c = Oscillator::new(KIND_NOISE, 48000.0, 7);
        let sa: Vec<f32> = osc_samples(&mut a, 64, 440.0);
        let sb: Vec<f32> = osc_samples(&mut b, 64, 440.0);
        let sc: Vec<f32> = osc_samples(&mut c, 64, 440.0);
        for (x, y) in sa.iter().zip(sb.iter()) {
            assert_eq!(x.to_bits(), y.to_bits(), "same seed must reproduce noise");
        }
        assert_ne!(sa[0].to_bits(), sc[0].to_bits(), "different seeds must differ");
        assert!(sa.iter().any(|&v| v >= -1.0 && v <= 1.0));
    }

    #[test]
    fn unified_fm_output_in_range() {
        let mut osc = Oscillator::new(KIND_FM, 48000.0, 1);
        for v in osc_samples(&mut osc, 480, 220.0) {
            assert!(v >= -1.0 && v <= 1.0, "fm out of range: {}", v);
        }
    }

    #[test]
    fn unified_pluck_decays() {
        let mut osc = Oscillator::new(KIND_PLUCK, 48000.0, 1);
        let samples = osc_samples(&mut osc, 480, 220.0);
        let max_first = samples.iter().take(20).map(|v| v.abs()).fold(0.0f32, f32::max);
        let max_last = samples.iter().skip(400).map(|v| v.abs()).fold(0.0f32, f32::max);
        assert!(max_last < max_first, "pluck should decay, first={} last={}", max_first, max_last);
    }

    #[test]
    fn unified_pluck_deterministic_with_seed() {
        let mut a = Oscillator::new(KIND_PLUCK, 48000.0, 42);
        let mut b = Oscillator::new(KIND_PLUCK, 48000.0, 42);
        let sa: Vec<f32> = osc_samples(&mut a, 32, 220.0);
        let sb: Vec<f32> = osc_samples(&mut b, 32, 220.0);
        for (x, y) in sa.iter().zip(sb.iter()) {
            assert_eq!(x.to_bits(), y.to_bits(), "pluck must be reproducible");
        }
    }

    #[test]
    fn unified_zero_frequency_silent() {
        let mut osc = Oscillator::new(KIND_SAW, 48000.0, 1);
        assert_eq!(osc.process(0.0, 0.0, 0.0, 1.0, 0.5), 0.0);
    }

    #[test]
    fn unified_reset_restarts_phase() {
        let mut osc = Oscillator::new(KIND_SAW, 48000.0, 1);
        let mut first = vec![];
        for _ in 0..480 {
            first.push(osc.process(440.0, 0.0, 0.0, 1.0, 0.5));
        }
        osc.reset();
        for (a, b) in first.iter().zip(osc_samples(&mut osc, 480, 440.0)) {
            assert_eq!(a.to_bits(), b.to_bits(), "reset should restart from same phase");
        }
    }

    #[test]
    fn unified_unknown_kind_defaults_to_saw() {
        let mut osc = Oscillator::new(999, 48000.0, 1);
        let samples = osc_samples(&mut osc, 480, 440.0);
        assert!(samples.iter().any(|&v| v > 0.8), "saw should ramp toward +1");
    }
}