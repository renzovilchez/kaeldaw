use std::cell::RefCell;
use wasm_bindgen::prelude::*;

thread_local! {
    static DELAYS: RefCell<Vec<Option<Delay>>> = const { RefCell::new(Vec::new()) };
}

struct Delay {
    buffer: Vec<f32>,
    max_samples: usize,
    write_pos: usize,
    delay_samples: usize,
    feedback: f32,
    mix: f32,
}

#[wasm_bindgen]
pub fn delay_init(sample_rate: f32, max_delay_seconds: f32) -> u32 {
    let max_samples = (sample_rate * max_delay_seconds) as usize;
    DELAYS.with(|delays| {
        let mut v = delays.borrow_mut();
        let handle = v.len() as u32;
        v.push(Some(Delay {
            buffer: vec![0.0; max_samples.max(1)],
            max_samples: max_samples.max(1),
            write_pos: 0,
            delay_samples: (sample_rate * 0.5) as usize,
            feedback: 0.5,
            mix: 0.5,
        }));
        handle
    })
}

#[wasm_bindgen]
pub fn delay_set(handle: u32, delay_time_seconds: f32, feedback: f32, mix: f32) {
    DELAYS.with(|delays| {
        let mut v = delays.borrow_mut();
        if let Some(Some(d)) = v.get_mut(handle as usize) {
            let t = delay_time_seconds.clamp(0.001, d.max_samples as f32 / 48000.0);
            d.delay_samples = (t * 48000.0) as usize;
            d.feedback = feedback.clamp(0.0, 1.0);
            d.mix = mix.clamp(0.0, 1.0);
        }
    })
}

#[wasm_bindgen]
pub fn delay_process(handle: u32, input: f32) -> f32 {
    DELAYS.with(|delays| {
        let mut v = delays.borrow_mut();
        if let Some(Some(d)) = v.get_mut(handle as usize) {
            let read_pos = if d.write_pos >= d.delay_samples {
                d.write_pos - d.delay_samples
            } else {
                d.max_samples - (d.delay_samples - d.write_pos)
            };
            let wet = d.buffer[read_pos % d.max_samples];
            d.buffer[d.write_pos] = input + wet * d.feedback;
            d.write_pos = (d.write_pos + 1) % d.max_samples;
            input * (1.0 - d.mix) + wet * d.mix
        } else {
            input
        }
    })
}

#[wasm_bindgen]
pub fn delay_free(handle: u32) {
    DELAYS.with(|delays| {
        let mut v = delays.borrow_mut();
        if let Some(slot) = v.get_mut(handle as usize) {
            *slot = None;
        }
    })
}

#[wasm_bindgen]
pub fn delay_count() -> u32 {
    DELAYS.with(|delays| delays.borrow().len() as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48000.0;

    fn run_delay_process(h: u32, input: f32, times: usize) -> f32 {
        let mut out = 0.0;
        for _ in 0..times {
            out = delay_process(h, input);
        }
        out
    }

    #[test]
    fn delay_impulse_echo_at_delay_time() {
        let h = delay_init(SR, 1.0);
        delay_set(h, 0.1, 0.0, 1.0);
        let delay_samples = (0.1 * SR) as usize;
        let out_initial = delay_process(h, 1.0);
        let out_before = run_delay_process(h, 0.0, delay_samples - 1);
        let out_at = delay_process(h, 0.0);
        assert!(
            (out_initial - 0.0).abs() < 0.001,
            "initial sample with mix=1 should be 0 (no echo yet), got {}",
            out_initial
        );
        assert!(
            out_before.abs() < 0.001,
            "before delay should be silent, got {}",
            out_before
        );
        assert!(
            (out_at - 1.0).abs() < 0.01,
            "at delay time should produce echo ~1.0, got {}",
            out_at
        );
        delay_free(h);
    }

    #[test]
    fn delay_feedback_decaying_repetitions() {
        let h = delay_init(SR, 1.0);
        delay_set(h, 0.05, 0.8, 0.5);
        let delay_samples = (0.05 * SR) as usize;
        let step = delay_samples;
        delay_process(h, 1.0);
        let echo1 = run_delay_process(h, 0.0, step);
        let echo2 = run_delay_process(h, 0.0, step);
        let echo3 = run_delay_process(h, 0.0, step);
        assert!(
            echo1.abs() > echo2.abs(),
            "echo1 {:.4} should be louder than echo2 {:.4}",
            echo1,
            echo2
        );
        assert!(
            echo2.abs() > echo3.abs(),
            "echo2 {:.4} should be louder than echo3 {:.4}",
            echo2,
            echo3
        );
        delay_free(h);
    }

    #[test]
    fn delay_mix_zero_returns_dry() {
        let h = delay_init(SR, 1.0);
        delay_set(h, 0.1, 0.5, 0.0);
        let out = delay_process(h, 0.75);
        assert!(
            (out - 0.75).abs() < 0.001,
            "mix=0 should return dry input, got {}",
            out
        );
        delay_free(h);
    }

    #[test]
    fn delay_free_double_no_crash() {
        let h = delay_init(SR, 1.0);
        delay_free(h);
        delay_free(h);
    }

    #[test]
    fn delay_invalid_handle_passthrough() {
        let out = delay_process(999, 0.5);
        assert!(
            (out - 0.5).abs() < 0.001,
            "invalid handle should passthrough, got {}",
            out
        );
    }

    #[test]
    fn delay_output_range() {
        let h = delay_init(SR, 1.0);
        delay_set(h, 0.1, 0.9, 1.0);
        for _ in 0..1000 {
            let out = delay_process(h, 1.0);
            assert!(
                out >= -1.5 && out <= 1.5,
                "out of range: {}",
                out
            );
        }
        delay_free(h);
    }
}
