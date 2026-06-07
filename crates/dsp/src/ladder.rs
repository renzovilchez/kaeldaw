use std::cell::RefCell;
use wasm_bindgen::prelude::*;

thread_local! {
    static FILTERS: RefCell<Vec<Option<Ladder>>> = const { RefCell::new(Vec::new()) };
}

struct Ladder {
    sample_rate: f32,
    cutoff: f32,
    resonance: f32,
    stage: [f32; 4],
    delay: [f32; 4],
}

fn calc_g(cutoff: f32, sample_rate: f32) -> f32 {
    let wd = 2.0 * std::f32::consts::PI * cutoff;
    let wa = (2.0 * sample_rate / std::f32::consts::PI) * (wd / (2.0 * sample_rate)).tan();
    wa / (2.0 * sample_rate)
}

#[wasm_bindgen]
pub fn ladder_init(sample_rate: f32) -> u32 {
    FILTERS.with(|filters| {
        let mut v = filters.borrow_mut();
        let handle = v.len() as u32;
        v.push(Some(Ladder {
            sample_rate,
            cutoff: 1000.0,
            resonance: 0.0,
            stage: [0.0; 4],
            delay: [0.0; 4],
        }));
        handle
    })
}

#[wasm_bindgen]
pub fn ladder_set(cutoff: f32, resonance: f32) -> u32 {
    FILTERS.with(|filters| {
        let mut v = filters.borrow_mut();
        let handle = v.len() as u32;
        let sr = if handle == 0 { 48000.0 } else { v[0].as_ref().map_or(48000.0, |f| f.sample_rate) };
        let cutoff = cutoff.clamp(20.0, sr * 0.49);
        let resonance = resonance.clamp(0.0, 0.999);
        v.push(Some(Ladder {
            sample_rate: sr,
            cutoff,
            resonance,
            stage: [0.0; 4],
            delay: [0.0; 4],
        }));
        handle
    })
}

#[wasm_bindgen]
pub fn ladder_process(handle: u32, input: f32) -> f32 {
    FILTERS.with(|filters| {
        let mut v = filters.borrow_mut();
        if let Some(Some(f))) = v.get_mut(handle as usize) {
            let g = calc_g(f.cutoff, f.sample_rate);
            let g = g.clamp(0.0, 1.0);
            let r = f.resonance * 4.0;

            let mut u = input - r * f.delay[3];
            if u > 1.0 { u = 1.0; } else if u < -1.0 { u = -1.0; }

            for i in 0..4 {
                let v_out = f.stage[i];
                let v_c = v_out + g * (u - v_out);
                let v_tanh = if v_c > 1.0 { 1.0 } else if v_c < -1.0 { -1.0 } else { v_c };
                f.stage[i] = v_tanh;
                f.delay[i] = v_out;
                u = f.stage[i];
            }

            f.delay[3]
        } else {
            input
        }
    })
}

#[wasm_bindgen]
pub fn ladder_free(handle: u32) {
    FILTERS.with(|filters| {
        let mut v = filters.borrow_mut();
        if let Some(slot) = v.get_mut(handle as usize) {
            *slot = None;
        }
    })
}

#[wasm_bindgen]
pub fn ladder_count() -> u32 {
    FILTERS.with(|filters| filters.borrow().len() as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48000.0;

    #[test]
    fn ladder_dc_passes_with_low_resonance() {
        let h = ladder_init(SR);
        let out = ladder_process(h, 1.0);
        assert!((out - 1.0).abs() < 0.1, "expected ~1.0, got {}", out);
        ladder_free(h);
    }

    #[test]
    fn ladder_cutoff_affects_output() {
        let h1 = ladder_init(SR);
        let h2 = ladder_set(200.0, 0.0);
        let mut out1 = 0.0;
        let mut out2 = 0.0;
        for i in 0..100 {
            let input = (2.0 * std::f32::consts::PI * 1000.0 * i as f32 / SR).sin();
            out1 = ladder_process(h1, input);
        }
        for i in 0..100 {
            let input = (2.0 * std::f32::consts::PI * 1000.0 * i as f32 / SR).sin();
            out2 = ladder_process(h2, input);
        }
        let diff = (out1 - out2).abs();
        assert!(diff > 0.001, "different cutoffs should differ, diff={}", diff);
        ladder_free(h1);
        ladder_free(h2);
    }

    #[test]
    fn ladder_resonance_peak() {
        let h1 = ladder_set(500.0, 0.0);
        let h2 = ladder_set(500.0, 0.9);
        let mut peak1 = 0.0;
        let mut peak2 = 0.0;
        for i in 0..200 {
            let input = (2.0 * std::f32::consts::PI * 500.0 * i as f32 / SR).sin();
            let o1 = ladder_process(h1, input);
            let o2 = ladder_process(h2, input);
            if o1.abs() > peak1 { peak1 = o1.abs(); }
            if o2.abs() > peak2 { peak2 = o2.abs(); }
        }
        assert!(
            peak2 > peak1,
            "high resonance should produce higher peak, peak1={} peak2={}",
            peak1,
            peak2
        );
        ladder_free(h1);
        ladder_free(h2);
    }

    #[test]
    fn ladder_free_double_no_crash() {
        let h = ladder_init(SR);
        ladder_free(h);
        ladder_free(h);
    }

    #[test]
    fn ladder_output_range() {
        let h = ladder_init(SR);
        for i in 0..200 {
            let input = (2.0 * std::f32::consts::PI * 440.0 * i as f32 / SR).sin();
            let out = ladder_process(h, input);
            assert!(
                out >= -1.5 && out <= 1.5,
                "out of range: {} at sample {}",
                out,
                i
            );
        }
        ladder_free(h);
    }

    #[test]
    fn ladder_multiple_instances() {
        let h1 = ladder_init(SR);
        let h2 = ladder_init(SR);
        let o1 = ladder_process(h1, 1.0);
        let o2 = ladder_process(h2, 0.5);
        assert!((o1 - 1.0).abs() < 0.1, "h1 expected ~1.0, got {}", o1);
        assert!((o2 - 0.5).abs() < 0.1, "h2 expected ~0.5, got {}", o2);
        ladder_free(h1);
        ladder_free(h2);
    }
}
