use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

use crate::delay::{delay_free, delay_init, delay_process, delay_set};
use crate::reverb::{reverb_free, reverb_init, reverb_process, reverb_set};

const NO_HANDLE: u32 = u32::MAX;
const DELAY_TIME: f32 = 0.3;
const DELAY_FEEDBACK: f32 = 0.4;
const DELAY_MIX: f32 = 0.3;
const REVERB_DECAY: f32 = 0.5;
const REVERB_MIX: f32 = 0.3;
const REVERB_DAMPING: f32 = 0.5;

struct MixerChannel {
    volume: f32,
    pan: f32,
    mute: bool,
    solo: bool,
    insert_delay: bool,
    insert_reverb: bool,
    delay_handle: u32,
    reverb_handle: u32,
    sends: Vec<(u32, f32)>,
}

struct MixerBus {
    volume: f32,
    insert_delay: bool,
    insert_reverb: bool,
    delay_handle: u32,
    reverb_handle: u32,
}

#[wasm_bindgen]
pub struct Mixer {
    sample_rate: f32,
    channels: Vec<MixerChannel>,
    buses: Vec<MixerBus>,
    master_volume: f32,
    master_left: f32,
    master_right: f32,
    bus_accum: Vec<f32>,
    last_left: f32,
    last_right: f32,
}

#[wasm_bindgen]
impl Mixer {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Mixer {
        Mixer {
            sample_rate,
            channels: Vec::new(),
            buses: Vec::new(),
            master_volume: 0.8,
            master_left: 0.0,
            master_right: 0.0,
            bus_accum: Vec::new(),
            last_left: 0.0,
            last_right: 0.0,
        }
    }

    pub fn set_master_volume(&mut self, volume: f32) {
        self.master_volume = volume.clamp(0.0, 2.0);
    }

    pub fn add_channel(&mut self) -> u32 {
        let index = self.channels.len() as u32;
        self.channels.push(MixerChannel {
            volume: 0.8,
            pan: 0.0,
            mute: false,
            solo: false,
            insert_delay: false,
            insert_reverb: false,
            delay_handle: NO_HANDLE,
            reverb_handle: NO_HANDLE,
            sends: Vec::new(),
        });
        index
    }

    pub fn remove_channel(&mut self, index: u32) {
        let idx = index as usize;
        if idx >= self.channels.len() {
            return;
        }
        let ch = &self.channels[idx];
        if ch.delay_handle != NO_HANDLE {
            delay_free(ch.delay_handle);
        }
        if ch.reverb_handle != NO_HANDLE {
            reverb_free(ch.reverb_handle);
        }
        self.channels.remove(idx);
    }

    pub fn set_channel_volume(&mut self, index: u32, volume: f32) {
        if let Some(ch) = self.channels.get_mut(index as usize) {
            ch.volume = volume.clamp(0.0, 2.0);
        }
    }

    pub fn set_channel_pan(&mut self, index: u32, pan: f32) {
        if let Some(ch) = self.channels.get_mut(index as usize) {
            ch.pan = pan.clamp(-1.0, 1.0);
        }
    }

    pub fn set_channel_mute(&mut self, index: u32, mute: bool) {
        if let Some(ch) = self.channels.get_mut(index as usize) {
            ch.mute = mute;
        }
    }

    pub fn set_channel_solo(&mut self, index: u32, solo: bool) {
        if let Some(ch) = self.channels.get_mut(index as usize) {
            ch.solo = solo;
        }
    }

    pub fn set_channel_insert_delay(&mut self, index: u32, enabled: bool) {
        if let Some(ch) = self.channels.get_mut(index as usize) {
            ch.insert_delay = enabled;
            if enabled && ch.delay_handle == NO_HANDLE {
                let handle = delay_init(self.sample_rate, 2.0);
                delay_set(handle, DELAY_TIME, DELAY_FEEDBACK, DELAY_MIX);
                ch.delay_handle = handle;
            }
        }
    }

    pub fn set_channel_insert_reverb(&mut self, index: u32, enabled: bool) {
        if let Some(ch) = self.channels.get_mut(index as usize) {
            ch.insert_reverb = enabled;
            if enabled && ch.reverb_handle == NO_HANDLE {
                let handle = reverb_init(self.sample_rate);
                reverb_set(handle, REVERB_DECAY, REVERB_MIX, REVERB_DAMPING);
                ch.reverb_handle = handle;
            }
        }
    }

    pub fn set_channel_send(&mut self, channel_index: u32, bus_index: u32, level: f32) {
        let ch_idx = channel_index as usize;
        let bus_idx = bus_index as usize;
        if ch_idx >= self.channels.len() || bus_idx >= self.buses.len() {
            return;
        }
        let ch = &mut self.channels[ch_idx];
        let level = level.clamp(0.0, 1.0);
        if let Some(send) = ch.sends.iter_mut().find(|s| s.0 == bus_index) {
            send.1 = level;
        } else {
            ch.sends.push((bus_index, level));
        }
    }

    pub fn add_bus(&mut self) -> u32 {
        let index = self.buses.len() as u32;
        self.buses.push(MixerBus {
            volume: 0.8,
            insert_delay: false,
            insert_reverb: false,
            delay_handle: NO_HANDLE,
            reverb_handle: NO_HANDLE,
        });
        self.bus_accum.push(0.0);
        index
    }

    pub fn remove_bus(&mut self, index: u32) {
        let idx = index as usize;
        if idx >= self.buses.len() {
            return;
        }
        let bus = &self.buses[idx];
        if bus.delay_handle != NO_HANDLE {
            delay_free(bus.delay_handle);
        }
        if bus.reverb_handle != NO_HANDLE {
            reverb_free(bus.reverb_handle);
        }
        self.buses.remove(idx);
        self.bus_accum.remove(idx);
    }

    pub fn set_bus_volume(&mut self, index: u32, volume: f32) {
        if let Some(bus) = self.buses.get_mut(index as usize) {
            bus.volume = volume.clamp(0.0, 2.0);
        }
    }

    pub fn set_bus_insert_delay(&mut self, index: u32, enabled: bool) {
        if let Some(bus) = self.buses.get_mut(index as usize) {
            bus.insert_delay = enabled;
            if enabled && bus.delay_handle == NO_HANDLE {
                let handle = delay_init(self.sample_rate, 2.0);
                delay_set(handle, DELAY_TIME, DELAY_FEEDBACK, DELAY_MIX);
                bus.delay_handle = handle;
            }
        }
    }

    pub fn set_bus_insert_reverb(&mut self, index: u32, enabled: bool) {
        if let Some(bus) = self.buses.get_mut(index as usize) {
            bus.insert_reverb = enabled;
            if enabled && bus.reverb_handle == NO_HANDLE {
                let handle = reverb_init(self.sample_rate);
                reverb_set(handle, REVERB_DECAY, REVERB_MIX, REVERB_DAMPING);
                bus.reverb_handle = handle;
            }
        }
    }

    pub fn process_channel_index(&mut self, index: u32, left: f32, right: f32) {
        let idx = index as usize;
        if idx >= self.channels.len() {
            return;
        }
        self.process_channel_at(idx, left, right);
    }

    fn process_channel_at(&mut self, idx: usize, left: f32, right: f32) {
        let has_solo = self.channels.iter().any(|c| c.solo);
        if self.channels[idx].mute {
            return;
        }
        if has_solo && !self.channels[idx].solo {
            return;
        }
        let mut m = (left + right) * 0.5;
        if self.channels[idx].insert_delay && self.channels[idx].delay_handle != NO_HANDLE {
            m = delay_process(self.channels[idx].delay_handle, m);
        }
        if self.channels[idx].insert_reverb && self.channels[idx].reverb_handle != NO_HANDLE {
            m = reverb_process(self.channels[idx].reverb_handle, m);
        }
        let out_l = left + m * 0.5;
        let out_r = right + m * 0.5;
        let angle = ((self.channels[idx].pan + 1.0) * PI) / 4.0;
        let pan_l = angle.cos();
        let pan_r = angle.sin();
        let vol = self.channels[idx].volume;
        self.master_left += out_l * vol * pan_l;
        self.master_right += out_r * vol * pan_r;

        let sends = self.channels[idx].sends.clone();
        for (bus_index, level) in sends {
            if level <= 0.0 {
                continue;
            }
            let bi = bus_index as usize;
            if bi < self.buses.len() {
                self.bus_accum[bi] += (out_l + out_r) * 0.5 * level;
            }
        }
    }

    pub fn finish_frame(&mut self) {
        let mut left = self.master_left;
        let mut right = self.master_right;
        self.master_left = 0.0;
        self.master_right = 0.0;

        for (i, bus) in self.buses.iter_mut().enumerate() {
            let mut out = self.bus_accum[i];
            self.bus_accum[i] = 0.0;
            if bus.insert_delay && bus.delay_handle != NO_HANDLE {
                out = delay_process(bus.delay_handle, out);
            }
            if bus.insert_reverb && bus.reverb_handle != NO_HANDLE {
                out = reverb_process(bus.reverb_handle, out);
            }
            left += out * bus.volume;
            right += out * bus.volume;
        }

        self.last_left = left * self.master_volume;
        self.last_right = right * self.master_volume;
    }

    pub fn get_master_left(&self) -> f32 {
        self.last_left
    }

    pub fn get_master_right(&self) -> f32 {
        self.last_right
    }
}

impl Drop for Mixer {
    fn drop(&mut self) {
        for ch in &self.channels {
            if ch.delay_handle != NO_HANDLE {
                delay_free(ch.delay_handle);
            }
            if ch.reverb_handle != NO_HANDLE {
                reverb_free(ch.reverb_handle);
            }
        }
        for bus in &self.buses {
            if bus.delay_handle != NO_HANDLE {
                delay_free(bus.delay_handle);
            }
            if bus.reverb_handle != NO_HANDLE {
                reverb_free(bus.reverb_handle);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48000.0;

    fn mixer() -> Mixer {
        let mut m = Mixer::new(SR);
        m.add_channel();
        m.add_channel();
        m
    }

    fn frame(m: &mut Mixer) -> (f32, f32) {
        m.finish_frame();
        (m.get_master_left(), m.get_master_right())
    }

    #[test]
    fn silence_in_silence_out() {
        let mut m = mixer();
        m.set_master_volume(1.0);
        m.set_channel_volume(0, 1.0);
        let (l, r) = frame(&mut m);
        assert_eq!(l, 0.0);
        assert_eq!(r, 0.0);
    }

    #[test]
    fn center_pan_is_equal() {
        let mut m = mixer();
        m.set_master_volume(1.0);
        m.set_channel_volume(0, 1.0);
        m.set_channel_pan(0, 0.0);
        m.process_channel_index(0, 0.5, 0.5);
        let (l, r) = frame(&mut m);
        assert!((l - r).abs() < 0.0001, "center pan must be equal, l={} r={}", l, r);
    }

    #[test]
    fn hard_left_pan_is_louder_left() {
        let mut m = mixer();
        m.set_master_volume(1.0);
        m.set_channel_volume(0, 1.0);
        m.set_channel_pan(0, -1.0);
        m.process_channel_index(0, 1.0, 1.0);
        let (l, r) = frame(&mut m);
        assert!(l > r, "hard left pan: l={} r={}", l, r);
    }

    #[test]
    fn hard_right_pan_is_louder_right() {
        let mut m = mixer();
        m.set_master_volume(1.0);
        m.set_channel_volume(0, 1.0);
        m.set_channel_pan(0, 1.0);
        m.process_channel_index(0, 1.0, 1.0);
        let (l, r) = frame(&mut m);
        assert!(r > l, "hard right pan: l={} r={}", l, r);
    }

    #[test]
    fn two_channels_sum() {
        let mut m = mixer();
        m.set_master_volume(1.0);
        m.set_channel_volume(0, 1.0);
        m.set_channel_volume(1, 1.0);
        m.process_channel_index(0, 0.5, 0.5);
        m.process_channel_index(1, 0.5, 0.5);
        let (l, _) = frame(&mut m);
        assert!(l > 0.5, "two channels should sum, l={}", l);
    }

    #[test]
    fn mute_silences_channel() {
        let mut m = mixer();
        m.set_master_volume(1.0);
        m.set_channel_volume(0, 1.0);
        m.set_channel_mute(0, true);
        m.process_channel_index(0, 1.0, 1.0);
        let (l, _) = frame(&mut m);
        assert_eq!(l, 0.0);
    }

    #[test]
    fn solo_isolates_soloed_channel() {
        let mut m = mixer();
        m.set_master_volume(1.0);
        m.set_channel_volume(0, 1.0);
        m.set_channel_volume(1, 1.0);
        m.set_channel_solo(0, true);
        m.process_channel_index(0, 1.0, 1.0);
        m.process_channel_index(1, 1.0, 1.0);
        let (l, _) = frame(&mut m);
        assert!(l.abs() > 0.0, "soloed channel should be audible");
    }

    #[test]
    fn send_reaches_bus() {
        let mut m = mixer();
        m.set_master_volume(1.0);
        m.set_channel_volume(0, 1.0);
        m.add_bus();
        m.set_bus_volume(0, 1.0);
        m.set_channel_send(0, 0, 1.0);
        m.process_channel_index(0, 0.5, 0.5);
        let (l, _) = frame(&mut m);
        assert!(l.abs() > 0.0, "send to bus should add to master");
    }

    #[test]
    fn master_volume_scales() {
        let mut low = mixer();
        low.set_master_volume(0.5);
        low.set_channel_volume(0, 1.0);
        low.process_channel_index(0, 0.4, 0.4);
        let (ll, _) = frame(&mut low);

        let mut high = mixer();
        high.set_master_volume(1.0);
        high.set_channel_volume(0, 1.0);
        high.process_channel_index(0, 0.4, 0.4);
        let (hl, _) = frame(&mut high);

        assert!(
            (hl - ll * 2.0).abs() < 0.0001,
            "master volume should scale linearly, low={} high={}",
            ll,
            hl
        );
    }

    #[test]
    fn unknown_channel_is_ignored() {
        let mut m = mixer();
        m.set_master_volume(1.0);
        m.process_channel_index(99, 1.0, 1.0);
        let (l, r) = frame(&mut m);
        assert_eq!(l, 0.0);
        assert_eq!(r, 0.0);
    }

    #[test]
    fn insert_delay_does_not_crash() {
        let mut m = mixer();
        m.set_master_volume(1.0);
        m.set_channel_volume(0, 1.0);
        m.set_channel_insert_delay(0, true);
        m.process_channel_index(0, 1.0, 1.0);
        let (l, _) = frame(&mut m);
        assert!(l.abs() > 0.0);
    }

    #[test]
    fn add_duplicate_channel_returns_new_index() {
        let mut m = Mixer::new(SR);
        let a = m.add_channel();
        let b = m.add_channel();
        assert_eq!(a, 0);
        assert_eq!(b, 1);
    }
}
