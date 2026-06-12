use std::sync::OnceLock;
use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

const TABLE_SIZE: usize = 4096;
type Table = Vec<f32>;

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
        let harmonic_counts = vec![512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
        // Trigger table generation once (lazy)
        saw_tables();
        Self { phase: 0.0, harmonic_counts, sample_rate }
    }

    pub fn process(&mut self, frequency: f32) -> f32 {
        if frequency <= 0.0 || self.sample_rate <= 0.0 { return 0.0; }
        let inc = frequency / self.sample_rate;

        let idx = pick_table_idx(&self.harmonic_counts, frequency, self.sample_rate);
        let table = &saw_tables()[idx];
        let pos = self.phase * TABLE_SIZE as f32;
        let i = pos as usize;
        let frac = pos - i as f32;
        let next = if i + 1 < TABLE_SIZE { i + 1 } else { 0 };
        let out = table[i] + frac * (table[next] - table[i]);

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
        let harmonic_counts = vec![511, 255, 127, 63, 31, 15, 7, 3, 1];
        square_tables();
        Self { phase: 0.0, harmonic_counts, sample_rate }
    }

    pub fn process(&mut self, frequency: f32) -> f32 {
        if frequency <= 0.0 || self.sample_rate <= 0.0 { return 0.0; }
        let inc = frequency / self.sample_rate;

        let idx = pick_table_idx(&self.harmonic_counts, frequency, self.sample_rate);
        let table = &square_tables()[idx];
        let pos = self.phase * TABLE_SIZE as f32;
        let i = pos as usize;
        let frac = pos - i as f32;
        let next = if i + 1 < TABLE_SIZE { i + 1 } else { 0 };
        let out = table[i] + frac * (table[next] - table[i]);

        self.phase = (self.phase + inc) % 1.0;
        out
    }

    pub fn reset(&mut self) { self.phase = 0.0; }
    pub fn get_phase(&self) -> f32 { self.phase % 1.0 }
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
}