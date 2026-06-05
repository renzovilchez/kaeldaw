use wasm_bindgen::prelude::*;

const STATE_IDLE: u8 = 0;
const STATE_ATTACK: u8 = 1;
const STATE_DECAY: u8 = 2;
const STATE_SUSTAIN: u8 = 3;
const STATE_RELEASE: u8 = 4;

#[wasm_bindgen]
pub struct AdsrEnvelope {
    attack: f32,
    decay: f32,
    sustain: f32,
    release: f32,
    level: f32,
    state: u8,
    time: f32,
}

#[wasm_bindgen]
impl AdsrEnvelope {
    #[wasm_bindgen(constructor)]
    pub fn new(attack: f32, decay: f32, sustain: f32, release: f32) -> AdsrEnvelope {
        AdsrEnvelope {
            attack: attack.max(0.0),
            decay: decay.max(0.0),
            sustain: sustain.clamp(0.0, 1.0),
            release: release.max(0.0),
            level: 0.0,
            state: STATE_IDLE,
            time: 0.0,
        }
    }

    pub fn note_on(&mut self) {
        self.state = STATE_ATTACK;
        self.time = 0.0;
        if self.attack <= 0.0 {
            self.level = 1.0;
            self.state = STATE_DECAY;
        } else {
            self.level = 0.0;
        }
    }

    pub fn note_off(&mut self) {
        if self.state != STATE_IDLE {
            self.state = STATE_RELEASE;
            self.time = 0.0;
        }
    }

    pub fn process(&mut self, dt: f32) -> f32 {
        match self.state {
            STATE_ATTACK => {
                self.time += dt;
                if self.time >= self.attack {
                    self.level = 1.0;
                    self.state = STATE_DECAY;
                    self.time = 0.0;
                } else {
                    self.level = self.time / self.attack;
                }
            }
            STATE_DECAY => {
                if self.decay <= 0.0 {
                    self.level = self.sustain;
                    self.state = STATE_SUSTAIN;
                } else {
                    self.time += dt;
                    if self.time >= self.decay {
                        self.level = self.sustain;
                        self.state = STATE_SUSTAIN;
                    } else {
                        let t = self.time / self.decay;
                        self.level = 1.0 + t * (self.sustain - 1.0);
                    }
                }
            }
            STATE_SUSTAIN => {
                self.level = self.sustain;
            }
            STATE_RELEASE => {
                if self.release <= 0.0 {
                    self.level = 0.0;
                    self.state = STATE_IDLE;
                } else {
                    self.time += dt;
                    if self.time >= self.release {
                        self.level = 0.0;
                        self.state = STATE_IDLE;
                    } else {
                        let t = self.time / self.release;
                        self.level = self.level * (1.0 - t);
                    }
                }
            }
            _ => {}
        }
        self.level
    }

    pub fn is_finished(&self) -> bool {
        self.state == STATE_IDLE
    }

    pub fn get_state(&self) -> u8 {
        self.state
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adsr_new_idle() {
        let mut e = AdsrEnvelope::new(0.1, 0.2, 0.5, 0.3);
        assert_eq!(e.get_state(), STATE_IDLE);
        assert!((e.process(0.0) - 0.0).abs() < 0.001);
    }

    #[test]
    fn adsr_note_on_starts_attack() {
        let mut e = AdsrEnvelope::new(0.1, 0.2, 0.5, 0.3);
        e.note_on();
        assert_eq!(e.get_state(), STATE_ATTACK);
        assert!((e.process(0.0) - 0.0).abs() < 0.001);
    }

    #[test]
    fn adsr_attack_halfway() {
        let mut e = AdsrEnvelope::new(0.1, 0.2, 0.5, 0.3);
        e.note_on();
        let v = e.process(0.05);
        assert!((v - 0.5).abs() < 0.001, "expected 0.5, got {}", v);
    }

    #[test]
    fn adsr_attack_to_decay() {
        let mut e = AdsrEnvelope::new(0.1, 0.2, 0.5, 0.3);
        e.note_on();
        e.process(0.1);
        assert_eq!(e.get_state(), STATE_DECAY);
        let v = e.process(0.0);
        assert!((v - 1.0).abs() < 0.001, "expected 1.0, got {}", v);
    }

    #[test]
    fn adsr_decay_to_sustain() {
        let mut e = AdsrEnvelope::new(0.1, 0.2, 0.5, 0.3);
        e.note_on();
        e.process(0.1);
        e.process(0.2);
        assert_eq!(e.get_state(), STATE_SUSTAIN);
        let v = e.process(0.0);
        assert!((v - 0.5).abs() < 0.001, "expected 0.5, got {}", v);
    }

    #[test]
    fn adsr_sustain_holds() {
        let mut e = AdsrEnvelope::new(0.1, 0.2, 0.5, 0.3);
        e.note_on();
        e.process(0.1);
        e.process(0.2);
        let v = e.process(2.0);
        assert!((v - 0.5).abs() < 0.001, "expected 0.5, got {}", v);
    }

    #[test]
    fn adsr_release_halfway() {
        let mut e = AdsrEnvelope::new(0.1, 0.2, 0.5, 0.3);
        e.note_on();
        e.process(0.1);
        e.process(0.2);
        e.note_off();
        // release started from sustain 0.5, at t=0.15 of 0.3s → level = 0.5 * (1 - 0.5) = 0.25
        let v = e.process(0.15);
        assert!((v - 0.25).abs() < 0.001, "expected 0.25, got {}", v);
    }

    #[test]
    fn adsr_release_finishes() {
        let mut e = AdsrEnvelope::new(0.1, 0.2, 0.5, 0.3);
        e.note_on();
        e.process(0.1);
        e.process(0.2);
        e.note_off();
        e.process(0.3);
        assert!(e.is_finished());
        let v = e.process(0.0);
        assert!((v - 0.0).abs() < 0.001, "expected 0.0, got {}", v);
    }

    #[test]
    fn adsr_note_off_idle_noop() {
        let mut e = AdsrEnvelope::new(0.1, 0.2, 0.5, 0.3);
        assert_eq!(e.get_state(), STATE_IDLE);
        e.note_off();
        assert_eq!(e.get_state(), STATE_IDLE);
    }

    #[test]
    fn adsr_clamp_negative() {
        let e = AdsrEnvelope::new(-0.1, -0.2, 1.5, -0.3);
        assert!((e.attack - 0.0).abs() < 0.001);
        assert!((e.decay - 0.0).abs() < 0.001);
        assert!((e.sustain - 1.0).abs() < 0.001);
        assert!((e.release - 0.0).abs() < 0.001);
    }

    #[test]
    fn adsr_retrigger_resets_attack() {
        let mut e = AdsrEnvelope::new(0.1, 0.2, 0.5, 0.3);
        e.note_on();
        e.process(0.05);
        // retrigger note_on during attack
        e.note_on();
        assert_eq!(e.get_state(), STATE_ATTACK);
        let v = e.process(0.0);
        assert!((v - 0.0).abs() < 0.001, "expected 0.0, got {}", v);
    }

    #[test]
    fn adsr_zero_attack_goes_to_decay() {
        let mut e = AdsrEnvelope::new(0.0, 0.2, 0.5, 0.3);
        e.note_on();
        assert_eq!(e.get_state(), STATE_DECAY);
    }
}
