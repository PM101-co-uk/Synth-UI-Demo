// Editor app: prompt → scene, live preview, step editor, post-production
// settings, scene JSON, and embed export.

import {
  TEMPLATES, FRAMES, FONTS, DARK_SET, LIGHT_SET,
  generateScene, DEFAULT_PROMPT, EXAMPLES,
} from './scenes.js';
import { Player } from './engine.js';
import { analyzeSite, applyAnalysis } from './analyze.js';

const $ = (s) => document.querySelector(s);
const STORAGE_KEY = 'synthui.v2';

// ───────────────────────── State ─────────────────────────

let state;
try {
  state = JSON.parse(localStorage.getItem(STORAGE_KEY));
} catch { /* fall through */ }
if (!state || !state.scene || !TEMPLATES[state.scene.template]) {
  state = { prompt: DEFAULT_PROMPT, scene: generateScene(DEFAULT_PROMPT) };
}

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, 300);
}

// ───────────────────────── Player ─────────────────────────

const player = new Player($('#stage'), {
  onStep(i, step) {
    document.querySelectorAll('.step-row').forEach((r, ri) => r.classList.toggle('active', ri === i));
    $('#status').textContent = step ? `▶ ${stepLabel(step)}` : 'Ready — press ▶ Play';
  },
  onDone() { $('#status').textContent = '✓ Scene finished — tweak anything and replay'; },
});

function refresh({ steps = true, settings = false } = {}) {
  player.stop();
  player.load(state.scene);
  if (steps) renderSteps();
  if (settings) renderSettings();
  renderJson();
  save();
}

// ───────────────────────── Prompt ─────────────────────────

$('#prompt').value = state.prompt;
$('#prompt').addEventListener('input', (e) => { state.prompt = e.target.value; save(); });

async function generate() {
  state.scene = generateScene(state.prompt);
  refresh({ settings: true });
  if (state.scene.url) {
    $('#status').textContent = `🔎 Analyzing ${state.scene.url} — building themed mock…`;
    try {
      const a = await analyzeSite(state.scene.url);
      applyAnalysis(state.scene, a);
      refresh({ settings: true });
      $('#status').textContent = `✓ Themed from ${a.domain} — press ▶ Play`;
    } catch {
      $('#status').textContent = `⚠ Couldn't fetch ${state.scene.url} (blocked) — using a generated palette instead`;
    }
  } else {
    $('#status').textContent = 'Scene built — press ▶ Play';
  }
}
$('#btnGenerate').addEventListener('click', generate);
$('#prompt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate();
});

const exWrap = $('#examples');
for (const ex of EXAMPLES) {
  const b = document.createElement('button');
  b.className = 'ex';
  b.textContent = ex.length > 46 ? `${ex.slice(0, 44)}…` : ex;
  b.title = ex;
  b.addEventListener('click', () => {
    state.prompt = ex;
    $('#prompt').value = ex;
    generate();
  });
  exWrap.appendChild(b);
}

// ───────────────────────── Steps editor ─────────────────────────

const ACTION_ICONS = { wait: '⏱', move: '🖱', click: '👆', type: '⌨️', scroll: '🧭', toast: '🔔', op: '⚙️' };

function stepLabel(step) {
  if (step.label) return step.label;
  switch (step.action) {
    case 'wait': return `Wait ${step.ms ?? 600}ms`;
    case 'type': return `Type “${(step.text || '').slice(0, 30)}”`;
    case 'toast': return `Toast “${step.text || ''}”`;
    case 'op': return `Run ${step.name}`;
    default: return `${step.action} ${step.target || ''}`;
  }
}

function renderSteps() {
  const wrap = $('#steps');
  wrap.innerHTML = '';
  const steps = state.scene.steps;
  steps.forEach((step, i) => {
    const row = document.createElement('div');
    row.className = 'step-row';
    row.innerHTML = `<span class="s-ico">${ACTION_ICONS[step.action] || '•'}</span>`;

    if (step.action === 'type' || step.action === 'toast') {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 's-text';
      inp.value = step.text || '';
      inp.addEventListener('change', () => { step.text = inp.value; refresh({ steps: false }); });
      const lbl = document.createElement('small');
      lbl.textContent = step.action === 'type' ? 'type' : 'toast';
      row.appendChild(lbl); row.appendChild(inp);
    } else if (step.action === 'wait') {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 's-ms';
      inp.value = step.ms ?? 600;
      inp.min = 0; inp.step = 100;
      inp.addEventListener('change', () => { step.ms = Number(inp.value) || 0; refresh({ steps: false }); });
      const lbl = document.createElement('small');
      lbl.textContent = 'wait (ms)';
      row.appendChild(lbl); row.appendChild(inp);
    } else {
      const lbl = document.createElement('span');
      lbl.className = 's-label';
      lbl.textContent = stepLabel(step);
      row.appendChild(lbl);
    }

    const ctr = document.createElement('span');
    ctr.className = 's-ctr';
    const mk = (txt, fn, title) => {
      const b = document.createElement('b');
      b.textContent = txt; b.title = title;
      b.addEventListener('click', fn);
      ctr.appendChild(b);
    };
    mk('↑', () => { if (i > 0) { steps.splice(i - 1, 0, steps.splice(i, 1)[0]); refresh(); } }, 'Move up');
    mk('↓', () => { if (i < steps.length - 1) { steps.splice(i + 1, 0, steps.splice(i, 1)[0]); refresh(); } }, 'Move down');
    mk('✕', () => { steps.splice(i, 1); refresh(); }, 'Remove');
    row.appendChild(ctr);
    wrap.appendChild(row);
  });
}

$('#btnAddStep').addEventListener('click', () => {
  const action = $('#addAction').value;
  const step = { action };
  if (action === 'wait') step.ms = 800;
  if (action === 'type') { step.target = $('#addTarget').value || '.mock-input'; step.text = 'Hello world'; }
  if (action === 'click' || action === 'move') step.target = $('#addTarget').value || 'button';
  if (action === 'toast') step.text = 'Done ✓';
  state.scene.steps.push(step);
  refresh();
});

// ───────────────────────── Settings (post production) ─────────────────────────

function field(label, input) {
  const row = document.createElement('label');
  row.className = 'set-row';
  const span = document.createElement('span');
  span.textContent = label;
  row.appendChild(span);
  row.appendChild(input);
  return row;
}
const mkSelect = (options, value, onchange) => {
  const s = document.createElement('select');
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o.value ?? o; opt.textContent = o.label ?? o;
    s.appendChild(opt);
  }
  s.value = value;
  s.addEventListener('change', () => onchange(s.value));
  return s;
};
const mkColor = (value, onchange) => {
  const i = document.createElement('input');
  i.type = 'color';
  i.value = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#6161ff';
  i.addEventListener('input', () => onchange(i.value));
  return i;
};
const mkRange = (min, max, step, value, onchange) => {
  const i = document.createElement('input');
  i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = value;
  i.addEventListener('input', () => onchange(Number(i.value)));
  return i;
};
const mkText = (value, onchange) => {
  const i = document.createElement('input');
  i.type = 'text'; i.value = value ?? '';
  i.addEventListener('change', () => onchange(i.value));
  return i;
};

function renderSettings() {
  const wrap = $('#settings');
  wrap.innerHTML = '';
  const sc = state.scene, t = sc.theme;
  const re = () => refresh({ steps: false });

  wrap.appendChild(field('Template', mkSelect(
    Object.entries(TEMPLATES).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` })), sc.template,
    (v) => {
      sc.template = v;
      sc.frame = TEMPLATES[v].defaultFrame;
      sc.content = TEMPLATES[v].defaultContent(sc.content.brand);
      sc.steps = TEMPLATES[v].defaultSteps(sc.content);
      refresh({ settings: true });
    })));
  wrap.appendChild(field('Frame', mkSelect(
    Object.entries(FRAMES).map(([k, v]) => ({ value: k, label: v.label })), sc.frame,
    (v) => { sc.frame = v; re(); })));
  wrap.appendChild(field('Brand name', mkText(sc.content.brand, (v) => { sc.content.brand = v; re(); })));
  wrap.appendChild(field('URL (browser bar)', mkText(sc.url, (v) => { sc.url = v; re(); })));
  wrap.appendChild(field('Primary color', mkColor(t.primary, (v) => { t.primary = v; re(); })));
  wrap.appendChild(field('Accent color', mkColor(t.accent, (v) => { t.accent = v; re(); })));
  wrap.appendChild(field('Dark mode', mkSelect(['off', 'on'], t.dark ? 'on' : 'off', (v) => {
    t.dark = v === 'on';
    Object.assign(t, t.dark ? DARK_SET : LIGHT_SET);
    re();
  })));
  wrap.appendChild(field('Corner radius', mkRange(0, 24, 1, t.radius, (v) => { t.radius = v; re(); })));
  wrap.appendChild(field('Font', mkSelect(FONTS, t.font, (v) => { t.font = v; re(); })));
  wrap.appendChild(field('Speed', mkRange(0.4, 2, 0.05, sc.speed, (v) => { sc.speed = v; save(); renderJson(); })));
  wrap.appendChild(field('Cursor', mkSelect(['arrow', 'hand', 'none'], sc.cursor, (v) => { sc.cursor = v; re(); })));
  wrap.appendChild(field('Sound', mkSelect(['on', 'off'], sc.sound === false || sc.sound === 'off' ? 'off' : 'on', (v) => { sc.sound = v === 'on'; re(); })));
  wrap.appendChild(field('Loop playback', mkSelect(['off', 'on'], sc.loop === true || sc.loop === 'on' ? 'on' : 'off', (v) => { sc.loop = v === 'on'; save(); renderJson(); })));
}

// ───────────────────────── Scene JSON ─────────────────────────

function renderJson() {
  $('#json').value = JSON.stringify(state.scene, null, 2);
  $('#jsonErr').textContent = '';
}
$('#btnApplyJson').addEventListener('click', () => {
  try {
    const sc = JSON.parse($('#json').value);
    if (!TEMPLATES[sc.template]) throw new Error(`Unknown template "${sc.template}"`);
    state.scene = sc;
    refresh({ settings: true });
    $('#status').textContent = 'Scene JSON applied';
  } catch (e) {
    $('#jsonErr').textContent = `⚠ ${e.message}`;
  }
});

// ───────────────────────── Transport + export ─────────────────────────

$('#btnPlay').addEventListener('click', () => player.play());
$('#btnStop').addEventListener('click', () => { player.stop(); player.load(state.scene); });

export function encodeScene(scene) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(scene))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function embedUrl() {
  const base = new URL('embed.html', location.href).href;
  return `${base}#${encodeScene(state.scene)}`;
}

async function copy(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    $('#status').textContent = okMsg;
  } catch {
    $('#json').value = text;
    $('#status').textContent = 'Clipboard blocked — copied into the JSON box instead';
  }
}

$('#btnEmbed').addEventListener('click', () => {
  const h = state.scene.frame === 'phone' ? 720 : 560;
  const snippet = `<iframe src="${embedUrl()}" style="width:100%;max-width:980px;height:${h}px;border:0;border-radius:14px;overflow:hidden" loading="lazy" title="${(state.scene.meta?.title || 'Synth UI demo').replace(/"/g, '&quot;')}"></iframe>`;
  copy(snippet, '✓ Embed <iframe> copied — paste it into any website');
});
$('#btnOpenEmbed').addEventListener('click', () => window.open(embedUrl(), '_blank'));

// ───────────────────────── Boot ─────────────────────────

renderSettings();
refresh();
$('#status').textContent = 'Ready — press ▶ Play, or describe a new scene and Generate';
