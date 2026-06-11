// Procedural UI-sound synthesis engine (Web Audio API).
// Every sound is described by a flat parameter object so the settings UI
// can edit anything and the engine can re-render live or offline.

export const PARAM_SCHEMA = [
  { key: 'wave',       label: 'Waveform',          type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'] },
  { key: 'freq',       label: 'Pitch (Hz)',        min: 40,    max: 4000,  step: 1 },
  { key: 'freqEnd',    label: 'Pitch sweep → (Hz)',min: 40,    max: 4000,  step: 1 },
  { key: 'arp',        label: 'Arp (semitones)',   type: 'text', hint: 'e.g. 0,7 — blank for single hit' },
  { key: 'arpTime',    label: 'Arp spacing (s)',   min: 0.03,  max: 0.4,   step: 0.005 },
  { key: 'attack',     label: 'Attack (s)',        min: 0.001, max: 0.4,   step: 0.001 },
  { key: 'decay',      label: 'Decay (s)',         min: 0.005, max: 0.8,   step: 0.005 },
  { key: 'sustain',    label: 'Sustain level',     min: 0,     max: 1,     step: 0.01 },
  { key: 'hold',       label: 'Hold (s)',          min: 0,     max: 0.8,   step: 0.005 },
  { key: 'release',    label: 'Release (s)',       min: 0.005, max: 1.5,   step: 0.005 },
  { key: 'noise',      label: 'Noise mix',         min: 0,     max: 1,     step: 0.01 },
  { key: 'filterType', label: 'Filter',            type: 'select', options: ['lowpass', 'highpass', 'bandpass'] },
  { key: 'cutoff',     label: 'Cutoff (Hz)',       min: 100,   max: 12000, step: 10 },
  { key: 'q',          label: 'Resonance (Q)',     min: 0.1,   max: 18,    step: 0.1 },
  { key: 'gain',       label: 'Volume',            min: 0,     max: 1,     step: 0.01 },
  { key: 'pan',        label: 'Pan',               min: -1,    max: 1,     step: 0.05 },
  { key: 'reverbSend', label: 'Reverb send',       min: 0,     max: 1,     step: 0.01 },
  { key: 'delaySend',  label: 'Delay send',        min: 0,     max: 1,     step: 0.01 },
  { key: 'jitter',     label: 'Humanize (pitch)',  min: 0,     max: 1,     step: 0.01 },
];

export const MASTER_SCHEMA = [
  { key: 'volume',        label: 'Master volume',     min: 0,    max: 1,   step: 0.01 },
  { key: 'speed',         label: 'Scene speed',       min: 0.4,  max: 2,   step: 0.05 },
  { key: 'reverb',        label: 'Reverb return',     min: 0,    max: 1,   step: 0.01 },
  { key: 'reverbSize',    label: 'Reverb size (s)',   min: 0.3,  max: 5,   step: 0.1 },
  { key: 'delayTime',     label: 'Delay time (s)',    min: 0.05, max: 0.8, step: 0.01 },
  { key: 'delayFeedback', label: 'Delay feedback',    min: 0,    max: 0.85,step: 0.01 },
  { key: 'delayMix',      label: 'Delay return',      min: 0,    max: 1,   step: 0.01 },
  { key: 'eqLow',         label: 'EQ low (dB)',       min: -18,  max: 18,  step: 0.5 },
  { key: 'eqMid',         label: 'EQ mid (dB)',       min: -18,  max: 18,  step: 0.5 },
  { key: 'eqHigh',        label: 'EQ high (dB)',      min: -18,  max: 18,  step: 0.5 },
  { key: 'compressor',    label: 'Compressor',        type: 'select', options: ['on', 'off'] },
];

export const MASTER_DEFAULTS = {
  volume: 0.9, speed: 1,
  reverb: 0.5, reverbSize: 1.6,
  delayTime: 0.22, delayFeedback: 0.25, delayMix: 0.6,
  eqLow: 0, eqMid: 0, eqHigh: 0,
  compressor: 'on',
};

const base = {
  wave: 'sine', freq: 880, freqEnd: 880, arp: '', arpTime: 0.08,
  attack: 0.002, decay: 0.08, sustain: 0, hold: 0, release: 0.06,
  noise: 0, filterType: 'lowpass', cutoff: 8000, q: 1,
  gain: 0.7, pan: 0, reverbSend: 0.1, delaySend: 0, jitter: 0,
};

export const SOUND_DEFS = {
  tap: {
    label: 'UI Tap', icon: '👆',
    params: { ...base, wave: 'sine', freq: 1850, freqEnd: 620, attack: 0.001, decay: 0.045, release: 0.03, noise: 0.35, cutoff: 5200, gain: 0.85, reverbSend: 0.06, jitter: 0.06 },
  },
  appOpen: {
    label: 'App Open', icon: '📱',
    params: { ...base, wave: 'triangle', freq: 320, freqEnd: 980, attack: 0.02, decay: 0.18, sustain: 0.25, hold: 0.05, release: 0.18, noise: 0.5, filterType: 'bandpass', cutoff: 1800, q: 1.2, gain: 0.6, reverbSend: 0.28 },
  },
  key: {
    label: 'Keyboard Key', icon: '⌨️',
    params: { ...base, wave: 'square', freq: 2400, freqEnd: 2400, attack: 0.001, decay: 0.02, release: 0.015, noise: 0.85, filterType: 'highpass', cutoff: 1500, q: 0.8, gain: 0.5, reverbSend: 0.03, jitter: 0.5 },
  },
  send: {
    label: 'Send Swoosh', icon: '🛫',
    params: { ...base, wave: 'sine', freq: 520, freqEnd: 1500, attack: 0.005, decay: 0.12, sustain: 0.2, hold: 0.02, release: 0.12, noise: 0.25, cutoff: 6000, q: 0.9, gain: 0.7, reverbSend: 0.18, delaySend: 0.1 },
  },
  connect: {
    label: 'Connecting Blips', icon: '📡',
    params: { ...base, wave: 'square', freq: 1240, freqEnd: 1240, arp: '0,0,5,0', arpTime: 0.13, attack: 0.001, decay: 0.03, release: 0.02, noise: 0.1, filterType: 'bandpass', cutoff: 2400, q: 4, gain: 0.45, pan: 0.2, reverbSend: 0.12, delaySend: 0.25 },
  },
  notify: {
    label: 'Bot Reply', icon: '💬',
    params: { ...base, wave: 'sine', freq: 932, freqEnd: 932, arp: '0,7', arpTime: 0.085, attack: 0.002, decay: 0.1, sustain: 0.3, hold: 0.02, release: 0.25, noise: 0.05, gain: 0.75, reverbSend: 0.32, delaySend: 0.15 },
  },
  success: {
    label: 'Success Chime', icon: '✅',
    params: { ...base, wave: 'triangle', freq: 660, freqEnd: 660, arp: '0,4,7,12', arpTime: 0.07, attack: 0.002, decay: 0.09, sustain: 0.15, release: 0.3, gain: 0.6, reverbSend: 0.45, delaySend: 0.2 },
  },
  error: {
    label: 'Error Buzz', icon: '⛔',
    params: { ...base, wave: 'sawtooth', freq: 200, freqEnd: 95, arp: '0,-2', arpTime: 0.16, attack: 0.004, decay: 0.1, sustain: 0.2, hold: 0.04, release: 0.12, noise: 0.15, cutoff: 1400, gain: 0.6, reverbSend: 0.1 },
  },
};

// Timeline event types — what the prompt parser produces. `repeat` events
// (typing) fire their sound many times with humanized spacing.
export const EVENT_DEFS = {
  tap:     { sound: 'tap',     label: 'Tap',        icon: '👆', dur: 0.3,  color: '#5eead4' },
  appOpen: { sound: 'appOpen', label: 'App open',   icon: '📱', dur: 0.65, color: '#7dd3fc' },
  typing:  { sound: 'key',     label: 'Typing',     icon: '⌨️', dur: 1.2,  color: '#c4b5fd', repeat: true, gap: 0.085 },
  send:    { sound: 'send',    label: 'Send',       icon: '🛫', dur: 0.5,  color: '#86efac' },
  connect: { sound: 'connect', label: 'Connecting', icon: '📡', dur: 0.85, color: '#fcd34d' },
  notify:  { sound: 'notify',  label: 'Bot reply',  icon: '💬', dur: 0.75, color: '#f9a8d4' },
  success: { sound: 'success', label: 'Success',    icon: '✅', dur: 0.9,  color: '#a7f3d0' },
  error:   { sound: 'error',   label: 'Error',      icon: '⛔', dur: 0.7,  color: '#fca5a5' },
};

const noiseCache = new WeakMap();
function noiseBuffer(ctx) {
  let buf = noiseCache.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buf);
  }
  return buf;
}

function makeImpulse(ctx, seconds, decay = 2.4) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

// Builds the master chain: input → EQ → compressor → volume → analyser → out,
// with reverb and delay return buses. Returns node refs so the app can tweak
// master settings live while audio is playing.
export function buildMaster(ctx, m) {
  const input = ctx.createGain();
  const eqLow = ctx.createBiquadFilter();
  eqLow.type = 'lowshelf'; eqLow.frequency.value = 220; eqLow.gain.value = m.eqLow;
  const eqMid = ctx.createBiquadFilter();
  eqMid.type = 'peaking'; eqMid.frequency.value = 1100; eqMid.Q.value = 0.9; eqMid.gain.value = m.eqMid;
  const eqHigh = ctx.createBiquadFilter();
  eqHigh.type = 'highshelf'; eqHigh.frequency.value = 4200; eqHigh.gain.value = m.eqHigh;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 24; comp.ratio.value = 5;
  comp.attack.value = 0.003; comp.release.value = 0.18;
  const compBypass = ctx.createGain();
  compBypass.gain.value = m.compressor === 'off' ? 1 : 0;
  const compSendGain = ctx.createGain();
  compSendGain.gain.value = m.compressor === 'off' ? 0 : 1;

  const volume = ctx.createGain();
  volume.gain.value = m.volume;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.75;

  input.connect(eqLow); eqLow.connect(eqMid); eqMid.connect(eqHigh);
  eqHigh.connect(compSendGain); compSendGain.connect(comp); comp.connect(volume);
  eqHigh.connect(compBypass); compBypass.connect(volume);
  volume.connect(analyser); analyser.connect(ctx.destination);

  const reverbBus = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulse(ctx, m.reverbSize);
  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = m.reverb;
  reverbBus.connect(convolver); convolver.connect(reverbReturn); reverbReturn.connect(input);

  const delayBus = ctx.createGain();
  const delay = ctx.createDelay(2);
  delay.delayTime.value = m.delayTime;
  const feedback = ctx.createGain();
  feedback.gain.value = m.delayFeedback;
  const delayReturn = ctx.createGain();
  delayReturn.gain.value = m.delayMix;
  delayBus.connect(delay); delay.connect(feedback); feedback.connect(delay);
  delay.connect(delayReturn); delayReturn.connect(input);

  return { ctx, input, analyser, volume, reverbBus, reverbReturn, convolver, delayBus, delay, feedback, delayReturn, eqLow, eqMid, eqHigh, compSendGain, compBypass };
}

function parseArp(str) {
  if (!str || !String(str).trim()) return [0];
  const steps = String(str).split(/[\s,;]+/).map(Number).filter((n) => Number.isFinite(n));
  return steps.length ? steps : [0];
}

function applyEnv(param, t, p, peak) {
  const floor = 0.0001;
  const sus = Math.max(peak * p.sustain, floor);
  const a = Math.max(p.attack, 0.001);
  const d = Math.max(p.decay, 0.003);
  const r = Math.max(p.release, 0.005);
  param.setValueAtTime(floor, t);
  param.exponentialRampToValueAtTime(Math.max(peak, floor), t + a);
  param.exponentialRampToValueAtTime(sus, t + a + d);
  param.setValueAtTime(sus, t + a + d + p.hold);
  param.exponentialRampToValueAtTime(floor, t + a + d + p.hold + r);
  param.setValueAtTime(0, t + a + d + p.hold + r + 0.002);
  return a + d + p.hold + r;
}

// Schedules one sound at `when` (in ctx time). Returns its end time.
export function scheduleSound(buses, p, when) {
  const { ctx } = buses;
  const filter = ctx.createBiquadFilter();
  filter.type = p.filterType;
  filter.frequency.value = p.cutoff;
  filter.Q.value = p.q;

  const pan = ctx.createStereoPanner();
  pan.pan.value = p.pan;
  filter.connect(pan);
  pan.connect(buses.input);
  if (p.reverbSend > 0.001) {
    const s = ctx.createGain(); s.gain.value = p.reverbSend;
    pan.connect(s); s.connect(buses.reverbBus);
  }
  if (p.delaySend > 0.001) {
    const s = ctx.createGain(); s.gain.value = p.delaySend;
    pan.connect(s); s.connect(buses.delayBus);
  }

  const notes = parseArp(p.arp);
  let end = when;
  notes.forEach((semis, i) => {
    const nt = when + i * p.arpTime;
    const jit = p.jitter ? Math.pow(2, (Math.random() * 2 - 1) * p.jitter * 3 / 12) : 1;
    const noteDur = (() => {
      let d = 0;
      if (p.noise < 0.999) {
        const osc = ctx.createOscillator();
        osc.type = p.wave;
        const f0 = Math.max(25, p.freq * Math.pow(2, semis / 12) * jit);
        osc.frequency.setValueAtTime(f0, nt);
        if (Math.abs(p.freqEnd - p.freq) > 1) {
          const f1 = Math.max(25, p.freqEnd * Math.pow(2, semis / 12) * jit);
          osc.frequency.exponentialRampToValueAtTime(f1, nt + Math.max(0.012, p.attack + p.decay + p.hold));
        }
        const g = ctx.createGain();
        d = applyEnv(g.gain, nt, p, p.gain * (1 - p.noise * 0.6));
        osc.connect(g); g.connect(filter);
        osc.start(nt); osc.stop(nt + d + 0.05);
      }
      if (p.noise > 0.001) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(ctx);
        src.loop = true;
        src.loopStart = 0;
        const g = ctx.createGain();
        d = Math.max(d, applyEnv(g.gain, nt, p, p.gain * p.noise));
        src.connect(g); g.connect(filter);
        src.start(nt, Math.random()); src.stop(nt + d + 0.05);
      }
      return d;
    })();
    end = Math.max(end, nt + noteDur);
  });
  return end;
}

// Lays out timeline events sequentially, schedules every sound, and returns
// visual cues for the phone mockup + total duration. Works on both a live
// AudioContext and an OfflineAudioContext.
export function scheduleTimeline(buses, events, soundParams, opts = {}) {
  const { startAt = 0, speed = 1, typingChars = 14 } = opts;
  const cues = [];
  let t = startAt;
  const gapBetween = 0.14 / speed;

  for (const ev of events) {
    const def = EVENT_DEFS[ev.type];
    if (!def) continue;
    const p = soundParams[def.sound];
    let evDur;
    if (def.repeat) {
      const count = ev.count || Math.min(28, Math.max(6, typingChars));
      let kt = t;
      for (let i = 0; i < count; i++) {
        scheduleSound(buses, p, kt);
        kt += (def.gap * (0.7 + Math.random() * 0.6)) / speed;
      }
      evDur = kt - t + 0.05;
    } else {
      const end = scheduleSound(buses, p, t);
      evDur = Math.max(def.dur / speed, end - t);
    }
    cues.push({ type: ev.type, at: t - startAt, dur: evDur });
    t += evDur + gapBetween;
  }
  return { cues, total: Math.max(0.1, t - startAt) };
}
