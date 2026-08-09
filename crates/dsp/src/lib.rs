mod adsr;
mod biquad;
mod delay;
mod ladder;
mod osc;
mod reverb;
mod sampler;
mod synth;
pub use adsr::AdsrEnvelope;
pub use osc::{BandlimitedSaw, BandlimitedSquare, Oscillator};
pub use sampler::Sampler;
pub use synth::PolySynth;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn osc_sine(_frequency: f32, phase: f32, _sample_rate: f32) -> f32 {
    (2.0 * std::f32::consts::PI * phase).sin()
}

#[wasm_bindgen]
pub fn osc_saw(_frequency: f32, phase: f32, _sample_rate: f32) -> f32 {
    let p = phase % 1.0;
    2.0 * p - 1.0
}

#[wasm_bindgen]
pub fn osc_square(_frequency: f32, phase: f32, _sample_rate: f32) -> f32 {
    if phase % 1.0 < 0.5 { 1.0 } else { -1.0 }
}

#[wasm_bindgen]
pub fn osc_wavetable(
    _frequency: f32,
    phase: f32,
    _sample_rate: f32,
    table: &[f32],
    table_size: u32,
) -> f32 {
    if table_size == 0 || table.is_empty() {
        return 0.0;
    }
    let size = table_size as f32;
    let index = (phase % 1.0) * size;
    let i = index as usize;
    let frac = index - i as f32;
    let next = if i + 1 < table.len() { i + 1 } else { 0 };
    table[i] + frac * (table[next] - table[i])
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32::consts::PI;

    const SR: f32 = 48000.0;

    #[test]
    fn osc_sine_phase_0() {
        let v = osc_sine(440.0, 0.0, SR);
        assert!((v - 0.0).abs() < 0.001, "expected 0, got {}", v);
    }

    #[test]
    fn osc_sine_phase_quarter() {
        let v = osc_sine(440.0, 0.25, SR);
        assert!((v - (PI / 2.0).sin()).abs() < 0.001, "expected {}, got {}", (PI / 2.0).sin(), v);
    }

    #[test]
    fn osc_sine_phase_half() {
        let v = osc_sine(440.0, 0.5, SR);
        assert!((v - PI.sin()).abs() < 0.001, "expected {}, got {}", PI.sin(), v);
    }

    #[test]
    fn osc_saw_phase_quarter() {
        let v = osc_saw(440.0, 0.25, SR);
        assert!((v - (-0.5)).abs() < 0.001, "expected -0.5, got {}", v);
    }

    #[test]
    fn osc_saw_phase_half() {
        let v = osc_saw(440.0, 0.5, SR);
        assert!((v - 0.0).abs() < 0.001, "expected 0, got {}", v);
    }

    #[test]
    fn osc_saw_phase_0() {
        let v = osc_saw(440.0, 0.0, SR);
        assert!((v - (-1.0)).abs() < 0.001, "expected -1, got {}", v);
    }

    #[test]
    fn osc_square_phase_0() {
        let v = osc_square(440.0, 0.0, SR);
        assert!((v - 1.0).abs() < 0.001, "expected 1, got {}", v);
    }

    #[test]
    fn osc_square_phase_half() {
        let v = osc_square(440.0, 0.5, SR);
        assert!((v - (-1.0)).abs() < 0.001, "expected -1, got {}", v);
    }

    #[test]
    fn osc_wavetable_linear_interp() {
        let table = vec![1.0, 0.0, -1.0, 0.0];
        let v = osc_wavetable(440.0, 0.125, SR, &table, 4);
        assert!((v - 0.5).abs() < 0.001, "expected 0.5, got {}", v);
    }

    #[test]
    fn osc_wavetable_empty() {
        let table = vec![];
        let v = osc_wavetable(440.0, 0.5, SR, &table, 0);
        assert!((v - 0.0).abs() < 0.001, "expected 0, got {}", v);
    }

    #[test]
    fn osc_output_range() {
        for freq in [100.0, 440.0, 1000.0] {
            for i in 0..100 {
                let p = i as f32 / 100.0;
                for f in [osc_sine, osc_saw, osc_square] {
                    let v = f(freq, p, SR);
                    assert!(
                        v >= -1.0 && v <= 1.0,
                        "{} at phase {} out of range: {}",
                        stringify!(f),
                        p,
                        v
                    );
                }
            }
        }
    }
}
