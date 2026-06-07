use std::cell::RefCell;
use wasm_bindgen::prelude::*;

thread_local! {
    static FILTERS: RefCell<Vec<Option<Biquad>>> = const { RefCell::new(Vec::new()) };
}

struct Biquad {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    z1: f32,
    z2: f32,
}

fn calc_coeffs(sample_rate: f32, filter_type: u32, cutoff: f32, q: f32, gain: f32) -> [f32; 5] {
    let sr = sample_rate;
    let fc = cutoff.clamp(20.0, sr * 0.49);
    let q = if q <= 0.0 { 0.001 } else { q };
    let a = 10.0_f32.powf(gain / 40.0);
    let omega = 2.0 * std::f32::consts::PI * fc / sr;
    let sn = omega.sin();
    let cs = omega.cos();
    let alpha = sn / (2.0 * q);
    let beta = (a.sqrt() / q).min(10.0);

    match filter_type {
        0 => {
            let b0 = (1.0 - cs) / 2.0 / (1.0 + alpha);
            let b1 = (1.0 - cs) / (1.0 + alpha);
            let b2 = (1.0 - cs) / 2.0 / (1.0 + alpha);
            let a1 = -2.0 * cs / (1.0 + alpha);
            let a2 = (1.0 - alpha) / (1.0 + alpha);
            [b0, b1, b2, a1, a2]
        }
        1 => {
            let b0 = (1.0 + cs) / 2.0 / (1.0 + alpha);
            let b1 = -(1.0 + cs) / (1.0 + alpha);
            let b2 = (1.0 + cs) / 2.0 / (1.0 + alpha);
            let a1 = -2.0 * cs / (1.0 + alpha);
            let a2 = (1.0 - alpha) / (1.0 + alpha);
            [b0, b1, b2, a1, a2]
        }
        2 => {
            let b0 = sn / 2.0 / (1.0 + alpha);
            let b1 = 0.0;
            let b2 = -sn / 2.0 / (1.0 + alpha);
            let a1 = -2.0 * cs / (1.0 + alpha);
            let a2 = (1.0 - alpha) / (1.0 + alpha);
            [b0, b1, b2, a1, a2]
        }
        3 => {
            let b0 = 1.0 / (1.0 + alpha);
            let b1 = -2.0 * cs / (1.0 + alpha);
            let b2 = 1.0 / (1.0 + alpha);
            let a1 = -2.0 * cs / (1.0 + alpha);
            let a2 = (1.0 - alpha) / (1.0 + alpha);
            [b0, b1, b2, a1, a2]
        }
        4 => {
            let b0 = (1.0 + alpha * a) / (1.0 + alpha / a);
            let b1 = -2.0 * cs / (1.0 + alpha / a);
            let b2 = (1.0 - alpha * a) / (1.0 + alpha / a);
            let a1 = -2.0 * cs / (1.0 + alpha / a);
            let a2 = (1.0 - alpha / a) / (1.0 + alpha / a);
            [b0, b1, b2, a1, a2]
        }
        5 => {
            let b0 = a * ((a + 1.0) - (a - 1.0) * cs + beta * sn) / ((a + 1.0) + (a - 1.0) * cs + beta * sn);
            let b1 = 2.0 * a * ((a - 1.0) - (a + 1.0) * cs) / ((a + 1.0) + (a - 1.0) * cs + beta * sn);
            let b2 = a * ((a + 1.0) - (a - 1.0) * cs - beta * sn) / ((a + 1.0) + (a - 1.0) * cs + beta * sn);
            let a1 = -2.0 * a * ((a - 1.0) + (a + 1.0) * cs) / ((a + 1.0) + (a - 1.0) * cs + beta * sn);
            let a2 = ((a + 1.0) + (a - 1.0) * cs - beta * sn) / ((a + 1.0) + (a - 1.0) * cs + beta * sn);
            [b0, b1, b2, a1, a2]
        }
        6 => {
            let b0 = a * ((a + 1.0) + (a - 1.0) * cs + beta * sn) / ((a + 1.0) - (a - 1.0) * cs + beta * sn);
            let b1 = -2.0 * a * ((a - 1.0) + (a + 1.0) * cs) / ((a + 1.0) - (a - 1.0) * cs + beta * sn);
            let b2 = a * ((a + 1.0) + (a - 1.0) * cs - beta * sn) / ((a + 1.0) - (a - 1.0) * cs + beta * sn);
            let a1 = 2.0 * a * ((a - 1.0) - (a + 1.0) * cs) / ((a + 1.0) - (a - 1.0) * cs + beta * sn);
            let a2 = ((a + 1.0) - (a - 1.0) * cs - beta * sn) / ((a + 1.0) - (a - 1.0) * cs + beta * sn);
            [b0, b1, b2, a1, a2]
        }
        _ => [1.0, 0.0, 0.0, 0.0, 0.0],
    }
}

#[wasm_bindgen]
pub fn biquad_init(_sample_rate: f32) -> u32 {
    FILTERS.with(|filters| {
        let mut v = filters.borrow_mut();
        let handle = v.len() as u32;
        v.push(Some(Biquad {
            b0: 1.0,
            b1: 0.0,
            b2: 0.0,
            a1: 0.0,
            a2: 0.0,
            z1: 0.0,
            z2: 0.0,
        }));
        handle
    })
}

#[wasm_bindgen]
pub fn biquad_set(sample_rate: f32, filter_type: u32, cutoff: f32, q: f32, gain: f32) -> u32 {
    let coeffs = calc_coeffs(sample_rate, filter_type, cutoff, q, gain);
    FILTERS.with(|filters| {
        let mut v = filters.borrow_mut();
        let handle = v.len() as u32;
        v.push(Some(Biquad {
            b0: coeffs[0],
            b1: coeffs[1],
            b2: coeffs[2],
            a1: coeffs[3],
            a2: coeffs[4],
            z1: 0.0,
            z2: 0.0,
        }));
        handle
    })
}

#[wasm_bindgen]
pub fn biquad_process(handle: u32, input: f32) -> f32 {
    FILTERS.with(|filters| {
        let mut v = filters.borrow_mut();
        if let Some(Some(f))) = v.get_mut(handle as usize) {
            let out = f.b0 * input + f.z1;
            f.z1 = f.b1 * input + f.z2 - f.a1 * out;
            f.z2 = f.b2 * input - f.a2 * out;
            out
        } else {
            input
        }
    })
}

#[wasm_bindgen]
pub fn biquad_free(handle: u32) {
    FILTERS.with(|filters| {
        let mut v = filters.borrow_mut();
        if let Some(slot) = v.get_mut(handle as usize) {
            *slot = None;
        }
    })
}

#[wasm_bindgen]
pub fn biquad_count() -> u32 {
    FILTERS.with(|filters| filters.borrow().len() as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48000.0;

    #[test]
    fn biquad_lp_dc_passes() {
        let h = biquad_set(SR, 0, 1000.0, 0.707, 0.0);
        let out = biquad_process(h, 1.0);
        assert!((out - 1.0).abs() < 0.01, "expected ~1.0, got {}", out);
        biquad_free(h);
    }

    #[test]
    fn biquad_hp_dc_attenuates() {
        let h = biquad_set(SR, 1, 1000.0, 0.707, 0.0);
        let out = biquad_process(h, 1.0);
        assert!(out.abs() < 0.01, "expected ~0.0, got {}", out);
        biquad_free(h);
    }

    #[test]
    fn biquad_init_returns_handle() {
        let h = biquad_init(SR);
        let out = biquad_process(h, 1.0);
        assert!((out - 1.0).abs() < 0.01, "expected ~1.0, got {}", out);
        biquad_free(h);
    }

    #[test]
    fn biquad_free_double_no_crash() {
        let h = biquad_init(SR);
        biquad_free(h);
        biquad_free(h);
    }

    #[test]
    fn biquad_notch_attenuates_center() {
        let h = biquad_set(SR, 3, 1000.0, 5.0, 0.0);
        let mut sum = 0.0;
        let omega = 2.0 * std::f32::consts::PI * 1000.0 / SR;
        for i in 0..1000 {
            let input = (omega * i as f32).sin();
            let out = biquad_process(h, input);
            sum += out.abs();
        }
        let avg = sum / 1000.0;
        assert!(avg < 0.15, "notch too weak: avg {}", avg);
        biquad_free(h);
    }

    #[test]
    fn biquad_lowshelf_boost_dc() {
        let h = biquad_set(SR, 5, 500.0, 0.707, 6.0);
        let out = biquad_process(h, 1.0);
        // low-shelf with +6dB gain at DC should be ~2.0 (6dB = factor 2)
        assert!((out - 2.0).abs() < 0.3, "expected ~2.0, got {}", out);
        biquad_free(h);
    }

    #[test]
    fn biquad_output_range() {
        let h = biquad_set(SR, 0, 1000.0, 0.707, 0.0);
        for i in 0..200 {
            let input = (2.0 * std::f32::consts::PI * 440.0 * i as f32 / SR).sin();
            let out = biquad_process(h, input);
            assert!(
                out >= -1.5 && out <= 1.5,
                "out of range: {} at sample {}",
                out,
                i
            );
        }
        biquad_free(h);
    }
}
