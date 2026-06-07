use std::cell::RefCell;
use wasm_bindgen::prelude::*;

thread_local! {
    static REVERBS: RefCell<Vec<Option<Reverb>>> = const { RefCell::new(Vec::new()) };
}

const COMB_DELAYS: [usize; 4] = [1397, 1601, 1777, 1949];
const ALLPASS_DELAYS: [usize; 2] = [225, 79];

struct CombFilter {
    buffer: Vec<f32>,
    pos: usize,
    size: usize,
    feedback: f32,
    damping: f32,
    z: f32,
}

struct AllPassFilter {
    buffer: Vec<f32>,
    pos: usize,
    size: usize,
    feedback: f32,
}

#[allow(dead_code)]
struct Reverb {
    decay: f32,
    mix: f32,
    damping: f32,
    combs: [CombFilter; 4],
    allpasses: [AllPassFilter; 2],
}

fn update_comb(comb: &mut CombFilter, decay: f32, damping: f32) {
    comb.feedback = decay * 0.85;
    comb.damping = damping;
}

fn process_comb(comb: &mut CombFilter, input: f32) -> f32 {
    let out = comb.buffer[comb.pos];
    let damped = comb.z * (1.0 - comb.damping) + out * comb.damping;
    comb.z = damped;
    comb.buffer[comb.pos] = input + damped * comb.feedback;
    comb.pos = (comb.pos + 1) % comb.size;
    out
}

fn update_allpass(ap: &mut AllPassFilter, decay: f32) {
    ap.feedback = decay * 0.7;
}

fn process_allpass(ap: &mut AllPassFilter, input: f32) -> f32 {
    let buf_out = ap.buffer[ap.pos];
    let out = buf_out - ap.feedback * input;
    ap.buffer[ap.pos] = input + ap.feedback * buf_out;
    ap.pos = (ap.pos + 1) % ap.size;
    out
}

#[wasm_bindgen]
pub fn reverb_init(sample_rate: f32) -> u32 {
    let sr = sample_rate as usize;
    REVERBS.with(|reverbs| {
        let mut v = reverbs.borrow_mut();
        let handle = v.len() as u32;
        v.push(Some(Reverb {
            decay: 0.5,
            mix: 0.5,
            damping: 0.5,
            combs: COMB_DELAYS.map(|d| CombFilter {
                buffer: vec![0.0; (d * sr / 48000).max(1)],
                pos: 0,
                size: (d * sr / 48000).max(1),
                feedback: 0.5,
                damping: 0.5,
                z: 0.0,
            }),
            allpasses: ALLPASS_DELAYS.map(|d| AllPassFilter {
                buffer: vec![0.0; (d * sr / 48000).max(1)],
                pos: 0,
                size: (d * sr / 48000).max(1),
                feedback: 0.5,
            }),
        }));
        handle
    })
}

#[wasm_bindgen]
pub fn reverb_set(handle: u32, decay: f32, mix: f32, damping: f32) {
    REVERBS.with(|reverbs| {
        let mut v = reverbs.borrow_mut();
        if let Some(Some(r)) = v.get_mut(handle as usize) {
            r.decay = decay.clamp(0.0, 1.0);
            r.mix = mix.clamp(0.0, 1.0);
            r.damping = damping.clamp(0.0, 1.0);
            for comb in &mut r.combs {
                update_comb(comb, r.decay, r.damping);
            }
            for ap in &mut r.allpasses {
                update_allpass(ap, r.decay);
            }
        }
    })
}

#[wasm_bindgen]
pub fn reverb_process(handle: u32, input: f32) -> f32 {
    REVERBS.with(|reverbs| {
        let mut v = reverbs.borrow_mut();
        if let Some(Some(r)) = v.get_mut(handle as usize) {
            let mut wet = 0.0;
            for comb in &mut r.combs {
                wet += process_comb(comb, input);
            }
            wet /= 4.0;
            for ap in &mut r.allpasses {
                wet = process_allpass(ap, wet);
            }
            let out = input * (1.0 - r.mix) + wet * r.mix;
            out.clamp(-1.0, 1.0)
        } else {
            input
        }
    })
}

#[wasm_bindgen]
pub fn reverb_free(handle: u32) {
    REVERBS.with(|reverbs| {
        let mut v = reverbs.borrow_mut();
        if let Some(slot) = v.get_mut(handle as usize) {
            *slot = None;
        }
    })
}

#[wasm_bindgen]
pub fn reverb_count() -> u32 {
    REVERBS.with(|reverbs| reverbs.borrow().len() as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48000.0;

    #[test]
    fn reverb_impulse_decays() {
        let h = reverb_init(SR);
        reverb_set(h, 0.9, 1.0, 0.5);
        reverb_process(h, 1.0);
        let mut early_energy = 0.0;
        for _ in 0..5000 {
            let out = reverb_process(h, 0.0);
            early_energy += out * out;
        }
        let mut late_energy = 0.0;
        for _ in 0..5000 {
            let out = reverb_process(h, 0.0);
            late_energy += out * out;
        }
        assert!(
            early_energy > 0.0,
            "reverb should produce energy in tail"
        );
        assert!(
            late_energy < early_energy,
            "reverb tail should decay: late_energy {} >= early_energy {}",
            late_energy,
            early_energy
        );
        reverb_free(h);
    }

    #[test]
    fn reverb_decay_zero_no_tail() {
        let h = reverb_init(SR);
        reverb_set(h, 0.0, 1.0, 0.0);
        reverb_process(h, 1.0);
        let mut tail_energy = 0.0;
        for _ in 0..1000 {
            let out = reverb_process(h, 0.0);
            tail_energy += out.abs();
        }
        assert!(
            tail_energy < 0.1,
            "decay=0 should have negligible tail, got {}",
            tail_energy
        );
        reverb_free(h);
    }

    #[test]
    fn reverb_mix_zero_returns_dry() {
        let h = reverb_init(SR);
        reverb_set(h, 0.5, 0.0, 0.5);
        let out = reverb_process(h, 0.75);
        assert!(
            (out - 0.75).abs() < 0.001,
            "mix=0 should return dry input, got {}",
            out
        );
        reverb_free(h);
    }

    #[test]
    fn reverb_free_double_no_crash() {
        let h = reverb_init(SR);
        reverb_free(h);
        reverb_free(h);
    }

    #[test]
    fn reverb_invalid_handle_passthrough() {
        let out = reverb_process(999, 0.5);
        assert!(
            (out - 0.5).abs() < 0.001,
            "invalid handle should passthrough, got {}",
            out
        );
    }

    #[test]
    fn reverb_output_range() {
        let h = reverb_init(SR);
        reverb_set(h, 0.9, 1.0, 0.5);
        for _ in 0..1000 {
            let out = reverb_process(h, 1.0);
            assert!(
                out >= -1.5 && out <= 1.5,
                "out of range: {}",
                out
            );
        }
        reverb_free(h);
    }
}
