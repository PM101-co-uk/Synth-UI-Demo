import {
  SOUND_DEFS, EVENT_DEFS, PARAM_SCHEMA, MASTER_SCHEMA, MASTER_DEFAULTS,
  buildMaster, scheduleSound, scheduleTimeline,
} from './sounds.js';
import { parsePrompt, DEFAULT_PROMPT } from './parser.js';
import { Phone } from './phone.js';
import { Visualizer, renderTimeline, animatePlayhead } from './visualizer.js';
import { renderSceneToWav, downloadBlob } from './wav.js';

const STORAGE_KEY = 'synthui.state.v1';
const $ = (sel) => document.querySelector(sel);

// ───────────────────────── State ─────────────────────────

const defaultState = () => ({
  prompt: DEFAULT_PROMPT,
  events: parsePrompt(DEFAULT_PROMPT),
  scene: {
    message: "What's the latest from PM101?",
    reply: '📊 PM101: All systems nominal. 3 new updates ready · latency 42ms.',
  },
  soundParams: Object.fromEntries(
    Object.entries(SOUND_DEFS).map(([k, d]) => [k, { ...d.params }])
  ),
  master: { ...MASTER_DEFAULTS },
});

function loadState() {
  const fresh = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return fresh;
    return {
      ...fresh,
      ...saved,
      scene: { ...fresh.scene, ...saved.scene },
      master: { ...fresh.master, ...saved.master },
      soundParams: Object.fromEntries(
        Object.keys(fresh.soundParams).map((k) => [
          k, { ...fresh.soundParams[k], ...(saved.soundParams || {})[k] },
        ])
      ),
    };
  } catch {
    return fresh;
  }
}

const state = loadState();
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, 250);
}

// ───────────────────────── Audio ─────────────────────────

let audioCtx = null;
let buses = null;
let playing = false;
let stopFlag = { stopped: true };

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    buses = buildMaster(audioCtx, state.master);
    viz.attach(buses.analyser);
    viz.start();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return buses;
}

// Live master tweaks go straight to the running nodes.
function applyMasterLive(key) {
  if (!buses) return;
  const m = state.master;
  const map = {
    volume: () => (buses.volume.gain.value = m.volume),
    reverb: () => (buses.reverbReturn.gain.value = m.reverb),
    delayTime: () => (buses.delay.delayTime.value = m.delayTime),
    delayFeedback: () => (buses.feedback.gain.value = m.delayFeedback),
    delayMix: () => (buses.delayReturn.gain.value = m.delayMix),
    eqLow: () => (buses.eqLow.gain.value = m.eqLow),
    eqMid: () => (buses.eqMid.gain.value = m.eqMid),
    eqHigh: () => (buses.eqHigh.gain.value = m.eqHigh),
    compressor: () => {
      buses.compSendGain.gain.value = m.compressor === 'off' ? 0 : 1;
      buses.compBypass.gain.value = m.compressor === 'off' ? 1 : 0;
    },
    reverbSize: () => {
      // convolver impulses can't be tweaked in place — rebuild on next play
    },
  };
  (map[key] || (() => {}))();
}

function typingChars() {
  return state.scene.message.length;
}

function playScene() {
  ensureAudio();
  stopScene(); // rebuilds the master chain, so grab buses after
  const b = buses;
  stopFlag = { stopped: false };
  playing = true;

  const t0 = audioCtx.currentTime + 0.08;
  const { cues, total } = scheduleTimeline(b, state.events, state.soundParams, {
    startAt: t0, speed: state.master.speed, typingChars: typingChars(),
  });
  renderTimeline($('#timeline'), cues, total);
  phone.playAll(cues, state.scene);
  const flag = stopFlag;
  animatePlayhead($('#playhead'), audioCtx, t0, total, () => flag.stopped);
  setTimeout(() => { if (!flag.stopped) playing = false; }, (total + 0.5) * 1000);
}

function stopScene() {
  stopFlag.stopped = true;
  playing = false;
  if (buses && audioCtx) {
    // Hard-cut everything scheduled: swap in a fresh master chain.
    try { buses.input.disconnect(); buses.analyser.disconnect(); } catch {}
    buses = buildMaster(audioCtx, state.master);
    viz.attach(buses.analyser);
  }
  phone.reset();
}

function previewSound(soundKey) {
  const b = ensureAudio();
  scheduleSound(b, state.soundParams[soundKey], audioCtx.currentTime + 0.03);
}

function previewEvent(type) {
  const b = ensureAudio();
  scheduleTimeline(b, [{ type, count: 8 }], state.soundParams, {
    startAt: audioCtx.currentTime + 0.03, speed: state.master.speed, typingChars: 8,
  });
}

// ───────────────────────── Timeline UI ─────────────────────────

function renderChips() {
  const wrap = $('#chips');
  wrap.innerHTML = '';
  state.events.forEach((ev, i) => {
    const def = EVENT_DEFS[ev.type];
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.style.setProperty('--c', def.color);
    chip.innerHTML = `<span>${def.icon} ${def.label}</span><b class="x" title="Remove">✕</b>`;
    chip.querySelector('.x').addEventListener('click', (e) => {
      e.stopPropagation();
      state.events.splice(i, 1);
      renderChips(); refreshTimelinePreview(); save();
    });
    chip.addEventListener('click', () => previewEvent(ev.type));
    wrap.appendChild(chip);
  });
  if (!state.events.length) {
    wrap.innerHTML = '<small class="empty">No events — build from the prompt or add from the palette below.</small>';
  }
}

function renderPalette() {
  const wrap = $('#palette');
  for (const [type, def] of Object.entries(EVENT_DEFS)) {
    const btn = document.createElement('button');
    btn.className = 'pal';
    btn.style.setProperty('--c', def.color);
    btn.textContent = `${def.icon} ${def.label}`;
    btn.addEventListener('click', () => {
      state.events.push({ type });
      renderChips(); refreshTimelinePreview(); save();
      previewEvent(type);
    });
    wrap.appendChild(btn);
  }
}

// Show the laid-out timeline even before pressing play (no audio scheduled —
// uses a throwaway offline context purely for the layout math).
function refreshTimelinePreview() {
  try {
    const ctx = new OfflineAudioContext(2, 44100, 44100);
    const b = buildMaster(ctx, state.master);
    const { cues, total } = scheduleTimeline(b, state.events, state.soundParams, {
      speed: state.master.speed, typingChars: typingChars(),
    });
    renderTimeline($('#timeline'), cues, total);
  } catch {}
}

// ───────────────────────── Settings UI ─────────────────────────

let selectedTab = 'tap';

function renderTabs() {
  const tabs = $('#tabs');
  tabs.innerHTML = '';
  const entries = [...Object.entries(SOUND_DEFS).map(([k, d]) => [k, `${d.icon} ${d.label}`]), ['master', '🎛 Master FX']];
  for (const [key, label] of entries) {
    const b = document.createElement('button');
    b.className = 'tab' + (key === selectedTab ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => { selectedTab = key; renderTabs(); renderParams(); });
    tabs.appendChild(b);
  }
}

function renderParams() {
  const wrap = $('#params');
  wrap.innerHTML = '';
  const isMaster = selectedTab === 'master';
  const schema = isMaster ? MASTER_SCHEMA : PARAM_SCHEMA;
  const target = isMaster ? state.master : state.soundParams[selectedTab];

  for (const def of schema) {
    const row = document.createElement('label');
    row.className = 'param';
    const name = document.createElement('span');
    name.textContent = def.label;
    row.appendChild(name);

    let input;
    if (def.type === 'select') {
      input = document.createElement('select');
      for (const opt of def.options) {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        input.appendChild(o);
      }
      input.value = target[def.key];
    } else if (def.type === 'text') {
      input = document.createElement('input');
      input.type = 'text';
      input.value = target[def.key];
      if (def.hint) input.placeholder = def.hint;
    } else {
      input = document.createElement('input');
      input.type = 'range';
      input.min = def.min; input.max = def.max; input.step = def.step;
      input.value = target[def.key];
    }

    const val = document.createElement('b');
    val.className = 'val';
    const fmt = (v) => (def.type === 'select' || def.type === 'text') ? '' : Number(v).toFixed(def.step < 0.01 ? 3 : def.step < 1 ? 2 : 0);
    val.textContent = fmt(target[def.key]);

    input.addEventListener('input', () => {
      target[def.key] = (def.type === 'select' || def.type === 'text') ? input.value : Number(input.value);
      val.textContent = fmt(input.value);
      if (isMaster) applyMasterLive(def.key);
      save();
    });
    // Auto-preview the sound when a tweak is released, so you hear it as you build.
    input.addEventListener('change', () => {
      if (!isMaster) previewSound(selectedTab);
      if (def.key === 'speed') refreshTimelinePreview();
    });

    row.appendChild(input);
    row.appendChild(val);
    wrap.appendChild(row);
  }
}

// ───────────────────────── Wiring ─────────────────────────

const phone = new Phone($('#iphone'));
const viz = new Visualizer($('#viz'));
viz.start();

$('#prompt').value = state.prompt;
$('#sceneMessage').value = state.scene.message;
$('#sceneReply').value = state.scene.reply;

$('#prompt').addEventListener('input', (e) => { state.prompt = e.target.value; save(); });
$('#sceneMessage').addEventListener('input', (e) => { state.scene.message = e.target.value; refreshTimelinePreview(); save(); });
$('#sceneReply').addEventListener('input', (e) => { state.scene.reply = e.target.value; save(); });

$('#btnBuild').addEventListener('click', () => {
  state.events = parsePrompt(state.prompt);
  renderChips(); refreshTimelinePreview(); save();
});

$('#btnPlay').addEventListener('click', playScene);
$('#btnStop').addEventListener('click', stopScene);

$('#btnExport').addEventListener('click', async () => {
  const btn = $('#btnExport');
  btn.disabled = true; btn.textContent = '… rendering';
  try {
    const blob = await renderSceneToWav(state.events, state.soundParams, state.master, {
      speed: state.master.speed, typingChars: typingChars(),
    });
    downloadBlob(blob, 'synth-ui-scene.wav');
  } finally {
    btn.disabled = false; btn.textContent = '⬇ Export WAV';
  }
});

$('#btnPreviewSound').addEventListener('click', () => {
  if (selectedTab !== 'master') previewSound(selectedTab);
  else playScene();
});
$('#btnResetSound').addEventListener('click', () => {
  if (selectedTab === 'master') {
    state.master = { ...MASTER_DEFAULTS };
    Object.keys(MASTER_DEFAULTS).forEach(applyMasterLive);
  } else {
    state.soundParams[selectedTab] = { ...SOUND_DEFS[selectedTab].params };
  }
  renderParams(); save();
});
$('#btnResetAll').addEventListener('click', () => {
  const fresh = defaultState();
  state.soundParams = fresh.soundParams;
  state.master = fresh.master;
  Object.keys(MASTER_DEFAULTS).forEach(applyMasterLive);
  renderParams(); refreshTimelinePreview(); save();
});

renderChips();
renderPalette();
renderTabs();
renderParams();
refreshTimelinePreview();
