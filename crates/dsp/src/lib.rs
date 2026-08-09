mod adsr;
mod biquad;
mod delay;
mod mixer;
mod osc;
mod reverb;
mod sampler;
mod synth;
pub use adsr::AdsrEnvelope;
pub use mixer::Mixer;
pub use osc::Oscillator;
pub use sampler::Sampler;
pub use synth::PolySynth;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn dsp_alloc(capacity: u32) -> u32 {
    let mut buf = Vec::<u8>::with_capacity(capacity as usize);
    let ptr = buf.as_mut_ptr() as u32;
    std::mem::forget(buf);
    ptr
}

#[wasm_bindgen]
pub fn dsp_free(ptr: u32, capacity: u32) {
    unsafe {
        let buf = Vec::<u8>::from_raw_parts(ptr as *mut u8, 0, capacity as usize);
        drop(buf);
    }
}

#[wasm_bindgen]
pub fn dsp_memory() -> JsValue {
    wasm_bindgen::memory().into()
}
