import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";
// @ts-expect-error - Vite provides WASM URL resolution
import wasmUrl from "kaeldaw-dsp/kaeldaw_dsp_bg.wasm?url";

const WORKLET_CODE = `
const TAU = Math.PI * 2;
const TABLE_SIZE = 4096;

function genSaw(h) {
  const t = new Float32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) {
    const x = i / TABLE_SIZE;
    let s = 0;
    for (let k = 1; k <= h; k++) s += Math.sin(TAU * k * x) / k;
    t[i] = s * (-2 / Math.PI);
  }
  return t;
}

function genSqr(h) {
  const t = new Float32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) {
    const x = i / TABLE_SIZE;
    let s = 0;
    for (let k = 1; k <= h; k += 2) s += Math.sin(TAU * k * x) / k;
    t[i] = s * (4 / Math.PI);
  }
  return t;
}

const SAW_T = [1,2,4,8,16,32,64,128,256,512].map(h => genSaw(h));
const SQR_T = [1,3,7,15,31,63,127,255,511].map(h => genSqr(h));

function pickT(cnt, f, sr) {
  const mh = Math.floor(sr / 2 / f);
  for (let i = 0; i < cnt.length; i++) if (cnt[i] <= mh) return i;
  return cnt.length - 1;
}

function readT(tbl, ph) {
  const pos = ph * TABLE_SIZE;
  const i = Math.floor(pos) % TABLE_SIZE;
  const fr = pos - i;
  const nx = (i + 1) % TABLE_SIZE;
  return tbl[i] + fr * (tbl[nx] - tbl[i]);
}

function midi2freq(n) { return 440 * Math.pow(2, (n-69)/12); }

class Osc {
  constructor(t) { this.phase = 0; this.type = t; }
  next(f, sr) {
    if (f <= 0 || sr <= 0) return 0;
    const inc = f / sr;
    let o;
    if (this.type === "sine") {
      o = Math.sin(TAU * this.phase);
    } else if (this.type === "saw") {
      o = readT(SAW_T[pickT([512,256,128,64,32,16,8,4,2,1], f, sr)], this.phase);
    } else {
      o = readT(SQR_T[pickT([511,255,127,63,31,15,7,3,1], f, sr)], this.phase);
    }
    this.phase = (this.phase + inc) % 1.0;
    return o;
  }
}

class Delay {
  constructor(sr,maxSec) {
    this.sr=sr;
    this.buf=new Float32Array(Math.round(sr*maxSec));
    this.wp=0;
    this.ds=Math.round(sr*0.4);
    this.fb=0.4;
    this.mx=0.3;
  }
  run(x) {
    const idx=(this.wp-this.ds+this.buf.length)%this.buf.length;
    const d=this.buf[idx];
    this.buf[this.wp]=x+d*this.fb;
    this.wp=(this.wp+1)%this.buf.length;
    return x+(d-x)*this.mx;
  }
}
class Reverb {
  constructor(sr) {
    this.sr=sr;
    this.cl=[0.05,0.056,0.061,0.068].map(t=>({b:new Float32Array(Math.round(t*sr)),wp:0,len:Math.round(t*sr)}));
    this.al=[0.012,0.017].map(t=>({b:new Float32Array(Math.round(t*sr)),wp:0,len:Math.round(t*sr)}));
    this.decay=0.4;this.mx=0.3;this.damp=0.5;
  }
  run(x) {
    let s=x;
    for(const c of this.cl){
      const idx=(c.wp-c.len+c.b.length)%c.b.length;
      const fb=c.b[idx];
      c.b[c.wp]=s+fb*this.decay;
      c.wp=(c.wp+1)%c.len;
      s=(s+fb*(1-this.damp))/2;
    }
    for(const a of this.al){
      const idx=(a.wp-a.len+a.b.length)%a.b.length;
      const d=a.b[idx];
      a.b[a.wp]=s+d*0.5;
      a.wp=(a.wp+1)%a.len;
      s=(d-s)*0.5;
    }
    return x*(1-this.mx)+s*this.mx;
  }
}
class Adsr {
  constructor(a,d,s,r) {
    this.a=Math.max(0,a); this.d=Math.max(0,d);
    this.s=Math.max(0,Math.min(1,s)); this.r=Math.max(0,r);
    this.level=0; this.state=0; this.time=0; this.rl=0;
  }
  on() {
    this.state=1; this.time=0;
    if (this.a<=0) { this.level=1; this.state=2; } else { this.level=0; }
  }
  off() {
    if (this.state===0) return;
    this.rl=this.level; this.state=4; this.time=0;
  }
  tick(dt) {
    switch (this.state) {
      case 1:
        this.time+=dt;
        if (this.time>=this.a) { this.level=1; this.state=2; this.time=0; }
        else { this.level=this.time/this.a; }
        break;
      case 2:
        if (this.d<=0) { this.level=this.s; this.state=3; }
        else {
          this.time+=dt;
          if (this.time>=this.d) { this.level=this.s; this.state=3; }
          else { this.level=1+(this.time/this.d)*(this.s-1); }
        }
        break;
      case 3: this.level=this.s; break;
      case 4:
        if (this.r<=0) { this.level=0; this.state=0; }
        else {
          this.time+=dt;
          if (this.time>=this.r) { this.level=0; this.state=0; }
          else { this.level=this.rl*(1-this.time/this.r); }
        }
        break;
    }
    return this.level;
  }
  get done() { return this.state===0; }
}

class Bq {
  constructor(b0,b1,b2,a1,a2) { this.b0=b0; this.b1=b1; this.b2=b2; this.a1=a1; this.a2=a2; this.z1=0; this.z2=0; }
  run(x) {
    const y = this.b0*x+this.z1;
    this.z1=this.b1*x+this.z2-this.a1*y;
    this.z2=this.b2*x-this.a2*y;
    return y;
  }
}

function lpCoeffs(sr,fc,q) {
  const cutoff=Math.max(20,Math.min(fc,sr*0.49));
  const qq=q<0.1?0.707:q;
  const w=TAU*cutoff/sr;
  const sn=Math.sin(w),cs=Math.cos(w);
  const a=sn/(2*qq);
  const d=1/(1+a);
  return [(1-cs)/2*d,(1-cs)*d,(1-cs)/2*d,-2*cs*d,(1-a)*d];
}

const DEFAULTS = {
  oscillatorType:"saw", oscillatorDetune:0,
  filterCutoff:8000, filterResonance:0.1,
  ampEnvAttack:0.01, ampEnvDecay:0.1,
  ampEnvSustain:0.7, ampEnvRelease:0.15, volume:0.5
};

let wasm=null;
function useWasm(){return wasm!==null;}

class WasmOsc {
  constructor(t,sr){
    this.type=t;this.sr=sr;
    this.ptr=t==="square"?wasm.bandlimitedsquare_new(sr):wasm.bandlimitedsaw_new(sr);
  }
  next(f,sr){return this.type==="sine"?Math.sin(TAU*wasm.bandlimitedsaw_get_phase(this.ptr)):wasm.bandlimitedsaw_process(this.ptr,f);}
}
class WasmAdsr {
  constructor(a,d,s,r){this.ptr=wasm.adsrenvelope_new(a,d,s,r);}
  on(){wasm.adsrenvelope_note_on(this.ptr);}
  off(){wasm.adsrenvelope_note_off(this.ptr);}
  tick(dt){return wasm.adsrenvelope_process(this.ptr,dt);}
  get done(){return wasm.adsrenvelope_is_finished(this.ptr)!==0;}
}
class WasmBq {
  constructor(sr,fc,q){this.h=wasm.biquad_set(sr,0,fc,q,0);}
  run(x){return wasm.biquad_process(this.h,x);}
}

function makeOsc(t,sr){return useWasm()?new WasmOsc(t,sr):new Osc(t);}
function makeAdsr(a,d,s,r){return useWasm()?new WasmAdsr(a,d,s,r):new Adsr(a,d,s,r);}
function makeFilter(sr,fc,q){return useWasm()?new WasmBq(sr,fc,q):new Bq(...lpCoeffs(sr,fc,q));}

class Synth {
  constructor(sr,cfg) {
    this.sr=sr; this.dt=1/sr;
    this.cfg=Object.assign({},DEFAULTS,cfg||{});
    this.vs=[];
    for(let i=0;i<6;i++) this.vs.push(this._mk());
  }
  _mk() {
    return {on:false,note:0,vel:0,age:0,rel:false,fadeIn:0,channelId:"",osc:makeOsc(this.cfg.oscillatorType,this.sr),adsr:makeAdsr(this.cfg.ampEnvAttack,this.cfg.ampEnvDecay,this.cfg.ampEnvSustain,this.cfg.ampEnvRelease),flt:makeFilter(this.sr,this.cfg.filterCutoff,this.cfg.filterResonance)};
  }
  _alloc() {
    for(let i=0;i<this.vs.length;i++) if(!this.vs[i].on) return this.vs[i];
    let o=this.vs[0];
    for(let i=1;i<this.vs.length;i++) if(this.vs[i].age<o.age) o=this.vs[i];
    if(o.on) o.fadeIn=Math.round(0.005*this.sr);
    return o;
  }
  noteOn(n,v,chId) {
    const vc=this._alloc();
    vc.note=Math.max(0,Math.min(127,Math.round(n)|0));
    vc.vel=Math.max(0,Math.min(127,v))/127;
    vc.age=++this.ac; vc.on=true; vc.rel=false;
    vc.channelId=chId||"";
    vc.osc=makeOsc(this.cfg.oscillatorType,this.sr);
    vc.adsr=makeAdsr(this.cfg.ampEnvAttack,this.cfg.ampEnvDecay,this.cfg.ampEnvSustain,this.cfg.ampEnvRelease);
    vc.adsr.on();
    vc.flt=makeFilter(this.sr,this.cfg.filterCutoff,this.cfg.filterResonance);
  }
  noteOff(n) {
    for(let i=0;i<this.vs.length;i++) {
      const v=this.vs[i];
      if(v.on&&v.note===n&&!v.rel){v.rel=true;v.adsr.off();}
    }
  }
  allOff() {
    for(let i=0;i<this.vs.length;i++) {
      const v=this.vs[i];
      if(v.on){v.rel=true;v.adsr.off();}
    }
  }
  setCfg(c) { if(c)Object.assign(this.cfg,c); }
  sample() {
    const cs={}; let nv=0;
    const det=Math.pow(2,this.cfg.oscillatorDetune/1200);
    const vol=this.cfg.volume;
    for(let j=0;j<this.vs.length;j++) {
      const v=this.vs[j];
      if(!v.on) continue;
      const f=midi2freq(v.note)*det||0;
      if(f<=0||!isFinite(f)) continue;
      const raw=v.osc.next(f,this.sr)||0;
      const flt=v.flt.run(raw)||0;
      const amp=v.adsr.tick(this.dt)||0;
      let g=flt*amp*v.vel*vol;
      if(v.fadeIn>0){g*=(1-v.fadeIn/Math.round(0.005*this.sr));v.fadeIn--;}
      const chId=v.channelId||"default";
      cs[chId]=(cs[chId]||0)+g;
      nv++;
      if(v.adsr.done) v.on=false;
    }
    if(nv>1){const n=1/Math.sqrt(nv);for(const k in cs)cs[k]*=n;}
    for(const k in cs)cs[k]=cs[k]/(1+Math.abs(cs[k]));
    return cs;
  }
}

class Proc extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    const sr=(opts.processorOptions&&opts.processorOptions.sampleRate)||48000;
    this.synth=new Synth(sr);
    this.sr=sr;
    this.events=[];
    this.idx=0;
    this.smp=0;
    this.t2s=1;
    this.bc=0;
    this.metro=false;
    this.delayJs=new Delay(sr,2);
    this.reverbJs=new Reverb(sr);
    this.delayHandle=-1;
    this.reverbHandle=-1;
    this.delayOn=false;
    this.reverbOn=false;
    this.fadeOut=0;
    this.fadeOutMax=0;
    this.ppqn2=960;
    this.bpb4=4;
    this.clen=0;this.cfreq=0;this.camp=0;this.cdecay=0;this.csmp=0;
    this.wb=new Float32Array(2048);this.wi=0;
    this.chState={};
    this.chDelay={};
    this.chReverb={};
    this.busDelay={};
    this.busReverb={};
    this.port.onmessage=e=>{
      const m=e.data;
      switch(m.type){
        case "events":{
          this.smp=Math.round(m.startTick*60/(m.bpm*m.ppqn)*this.sr);
          this.t2s=60/(m.bpm*m.ppqn)*this.sr;
          const sorted=m.events.slice().sort((a,b)=>a.tick-b.tick);
          const active=new Map();
          let ei=0;
          for(;ei<sorted.length;ei++){
            const ev=sorted[ei];
            if(Math.round(ev.tick*this.t2s)>=this.smp) break;
            if(ev.type==="on") active.set(ev.note,{vel:ev.velocity,chId:ev.channelId||""});
            else active.delete(ev.note);
          }
          this.events=sorted;
          this.idx=ei;
          for(const[n,v]of active) this.synth.noteOn(n,v.vel,v.chId);
          break;
        }
        case "noteOn": this.synth.noteOn(m.note,m.vel,m.channelId||""); break;
        case "noteOff": this.synth.noteOff(m.note); break;
        case "allOff":
          this.synth.allOff();
          this.fadeOut=Math.round(0.05*this.sr);
          this.fadeOutMax=this.fadeOut;
          break;
        case "cfg": this.synth.setCfg(m.config); break;
        case "metro": this.ppqn2=m.ppqn; this.bpb4=m.beats; this.metro=m.enabled; break;
        case "channelFx":{
          const c=this.chState[m.channelId]||{};
          if(m.volume!==void 0)c.volume=m.volume;
          if(m.pan!==void 0)c.pan=m.pan;
          if(m.mute!==void 0)c.mute=m.mute;
          if(m.insertDelay!==void 0)c.insertDelay=m.insertDelay;
          if(m.insertReverb!==void 0)c.insertReverb=m.insertReverb;
          if(m.sendLevel!==void 0)c.sendLevel=m.sendLevel;
          this.chState[m.channelId]=c;
          break;
        }
        case "wasm":{
          try{
            const inst=new WebAssembly.Instance(m.module,{wbg:{
              __wbindgen_throw:function(a,b){throw new Error("WASM error");},
              __wbindgen_init_externref_table:function(){}
            }});
            wasm=inst.exports;
            wasm.__wbindgen_start();
            this.delayHandle=wasm.delay_init(this.sr,2);
            wasm.delay_set(this.delayHandle,0.4,0.4,0.3);
            this.reverbHandle=wasm.reverb_init(this.sr);
            wasm.reverb_set(this.reverbHandle,0.4,0.3,0.5);
          }catch(e){
            this.port.postMessage({type:"err",m:"WASM init: "+e});
          }
          break;
        }
      }
    };
  }
  process(_i,o,_p) {
    try {
      const L=o[0]&&o[0][0],R=o[0]&&o[0][1];
      if(!L||!R) return true;
      const DC={volume:0.8,pan:0,mute:false,insertDelay:false,insertReverb:false,sendLevel:0};
      for(let i=0;i<L.length;i++) {
        const cur=this.smp+i;
        while(this.idx<this.events.length){
          const ev=this.events[this.idx];
          const evSmp=Math.round(ev.tick*this.t2s);
          if(evSmp>cur) break;
          this.idx++;
          if(evSmp===cur){
            if(ev.type==="on") this.synth.noteOn(ev.note,ev.velocity,ev.channelId||"");
            else this.synth.noteOff(ev.note);
          }
        }
        const chOut=this.synth.sample();
        let master=0;
        const busAc={};
        for(const chId in chOut){
          const sum=chOut[chId];
          const ch=this.chState[chId]||DC;
          if(ch.mute) continue;
          let ss=sum;
          if(ch.insertDelay){
            if(!this.chDelay[chId])this.chDelay[chId]=new Delay(this.sr,2);
            ss=this.chDelay[chId].run(ss);
          }
          if(ch.insertReverb){
            if(!this.chReverb[chId])this.chReverb[chId]=new Reverb(this.sr);
            ss=this.chReverb[chId].run(ss);
          }
          if(ch.sendLevel>0)busAc["reverb-bus"]=(busAc["reverb-bus"]||0)+ss*ch.sendLevel;
          const angle=(ch.pan+1)*Math.PI/4;
          master+=ss*ch.volume*(Math.cos(angle)+Math.sin(angle));
        }
        for(const busId in busAc){
          const bus=this.chState[busId];
          if(!bus) continue;
          let ss=busAc[busId];
          if(bus.insertDelay){
            if(!this.busDelay[busId])this.busDelay[busId]=new Delay(this.sr,2);
            ss=this.busDelay[busId].run(ss);
          }
          if(bus.insertReverb){
            if(!this.busReverb[busId])this.busReverb[busId]=new Reverb(this.sr);
            ss=this.busReverb[busId].run(ss);
          }
          master+=ss*bus.volume;
        }
        master=master/(1+Math.abs(master));
        if(this.metro){
          const tickAt=cur/this.t2s;
          const tickFloor=Math.floor(tickAt);
          const tickFloorPrev=Math.floor((cur-1)/this.t2s);
          if(tickFloor!==tickFloorPrev&&(tickFloor%this.ppqn2)===0){
            const isDown=(tickFloor%(this.ppqn2*this.bpb4))===0;
            this.cfreq=isDown?1200:1800;
            this.camp=isDown?0.5:0.35;
            this.cdecay=isDown?350:450;
            this.clen=Math.round(0.004*this.sr);
            this.csmp=0;
          }
          if(this.clen>0){
            const t=this.csmp/this.sr;
            const env=Math.exp(-t*this.cdecay);
            const click=Math.sin(2*Math.PI*this.cfreq*t)*this.camp*env;
            master+=click;
            this.clen--; this.csmp++;
          }
        }
        if(this.fadeOut>0){
          master*=this.fadeOut/this.fadeOutMax;
          this.fadeOut--;
        }
        L[i]=master; R[i]=master;
        this.wb[this.wi]=master; this.wi=(this.wi+1)%this.wb.length;
      }
      this.smp+=L.length;
      this.bc++;
      if(this.bc%20===0){
        const c=new Float32Array(this.wb.length);
        for(let i=0;i<c.length;i++)c[i]=this.wb[(this.wi+i)%this.wb.length];
        this.port.postMessage({type:"wf",buf:c.buffer},[c.buffer]);
      }
    } catch(e){
      this.port.postMessage({type:"err",m:String(e)});
    }
    return true;
  }
}
registerProcessor("kaeldaw-synth",Proc);
`;

let _moduleLoaded = false;

export class PolySynthOutputSingleton {
  private _worklet: AudioWorkletNode | null = null;
  private gain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private _rafId: number | null = null;
  private _onLevel: ((level: number) => void) | null = null;
  private _waveformBuf = new Float32Array(2048);
  private _waveformIdx = 0;
  private _pendingMetronome: { enabled: boolean; ppqn: number; beats: number } | null = null;
  private _channelStates = new Map<string, { volume: number; pan: number; mute: boolean; insertDelay: boolean; insertReverb: boolean; sendLevel: number; delaySend: number }>();

  set onLevel(cb: ((level: number) => void) | null) { this._onLevel = cb; }

  get synthInstance(): null { return null; }
  get isStarted(): boolean { return this._worklet !== null; }

  setChannelVolume(channelId: string, volume: number, pan: number, mute: boolean): void {
    const st = this._channelStates.get(channelId) || { volume: 0.8, pan: 0, mute: false, insertDelay: false, insertReverb: false, sendLevel: 0, delaySend: 0 };
    st.volume = volume; st.pan = pan; st.mute = mute;
    this._channelStates.set(channelId, st);
    this._worklet?.port.postMessage({ type: "channelFx", channelId, volume, pan, mute });
  }

  setChannelInsertFx(channelId: string, type: "delay" | "reverb", enabled: boolean, _wet: number): void {
    void _wet;
    const st = this._channelStates.get(channelId) || { volume: 0.8, pan: 0, mute: false, insertDelay: false, insertReverb: false, sendLevel: 0, delaySend: 0 };
    if (type === "delay") st.insertDelay = enabled;
    else st.insertReverb = enabled;
    this._channelStates.set(channelId, st);
    this._worklet?.port.postMessage({ type: "channelFx", channelId, insertDelay: st.insertDelay, insertReverb: st.insertReverb });
  }

  setChannelSendLevel(channelId: string, level: number): void {
    const st = this._channelStates.get(channelId) || { volume: 0.8, pan: 0, mute: false, insertDelay: false, insertReverb: false, sendLevel: 0, delaySend: 0 };
    st.sendLevel = level;
    this._channelStates.set(channelId, st);
    this._worklet?.port.postMessage({ type: "channelFx", channelId, sendLevel: level });
  }

  setConfig(config: Record<string, unknown>): void {
    this._worklet?.port.postMessage({ type: "cfg", config });
  }

  setMetronome(enabled: boolean, ppqn: number, beatsPerBar: number): void {
    this._pendingMetronome = { enabled, ppqn, beats: beatsPerBar };
    this._worklet?.port.postMessage({ type: "metro", enabled, ppqn, beats: beatsPerBar });
  }

  startScheduled(events: { tick: number; type: string; note: number; velocity: number; channelId: string }[], bpm: number, ppqn: number, startTick: number): void {
    this._worklet?.port.postMessage({ type: "events", events, bpm, ppqn, startTick });
  }

  noteOn(note: number, velocity: number, channelId?: string): void {
    this._worklet?.port.postMessage({ type: "noteOn", note, vel: velocity, channelId: channelId ?? "" });
  }
  noteOff(note: number): void {
    this._worklet?.port.postMessage({ type: "noteOff", note });
  }
  allNotesOff(): void {
    this._worklet?.port.postMessage({ type: "allOff" });
  }

  getWaveformSamples(): Float32Array | null {
    if (this._waveformIdx === 0) return null;
    return this._waveformBuf;
  }

  async start(): Promise<void> {
    this.stop();
    await AudioContextManager.resume();
    const ctx = AudioContextManager.getInstance();

    if (!_moduleLoaded) {
      const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      try {
        await ctx.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      _moduleLoaded = true;
    }

    this._worklet = new AudioWorkletNode(ctx, "kaeldaw-synth", {
      processorOptions: { sampleRate: ctx.sampleRate },
      outputChannelCount: [2],
    });

    this._worklet.port.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === "wf") {
        this._waveformBuf = new Float32Array(msg.buf);
        this._waveformIdx = this._waveformBuf.length;
      } else if (msg.type === "err") {
        console.error("Worklet error:", msg.m);
      } else if (msg.type === "wasm_ok") {
        console.log("WASM loaded in worklet");
      }
    };

    if (this._pendingMetronome) {
      this._worklet.port.postMessage({ type: "metro", ...this._pendingMetronome });
    }

    this.gain = ctx.createGain();
    this.gain.gain.value = 0.8;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this._worklet.connect(this.gain);
    this.gain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    this._runLoop();

    // Load WASM module → send to worklet (async, starts worklet with JS fallback first)
    try {
      const response = await fetch(wasmUrl);
      const bytes = await response.arrayBuffer();
      const module = await WebAssembly.compile(bytes);
      this._worklet.port.postMessage({ type: "wasm", module }, [module]);
    } catch (err) {
      console.warn("WASM load failed, using JS fallback:", err);
    }
  }

  stop(): void {
    try { this._worklet?.disconnect(); } catch { /* ok */ }
    try { this.gain?.disconnect(); } catch { /* ok */ }
    try { this.analyser?.disconnect(); } catch { /* ok */ }
    this._worklet = null;
    this.gain = null;
    this.analyser = null;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._level = 0;
    this._onLevel?.(0);
    this._waveformIdx = 0;
  }

  private _level = 0;
  private _runLoop(): void {
    if (!this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const loop = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      this._level = Math.min(1, Math.sqrt(sum / data.length) * 2.5);
      this._onLevel?.(this._level);
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }
}

export const PolySynthOutput = (() => {
  const key = Symbol.for("kaeldaw.PolySynthOutput");
  const g = globalThis as { [key: symbol]: PolySynthOutputSingleton | undefined };
  if (g[key]) g[key].stop();
  return g[key] ?? (g[key] = new PolySynthOutputSingleton());
})();
