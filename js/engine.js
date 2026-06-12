// Scene player: renders a scene's mock UI inside a device frame and runs its
// steps — moving a virtual cursor, clicking, typing, firing template ops —
// with optional synthesized UI sounds.

import { TEMPLATES, FRAMES, esc } from './scenes.js';
import { SOUND_DEFS, MASTER_DEFAULTS, buildMaster, scheduleSound } from './sounds.js';

class SoundFX {
  constructor() { this.enabled = true; }
  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.buses = buildMaster(this.ctx, { ...MASTER_DEFAULTS, reverb: 0.25, volume: 0.7 });
      } catch { this.enabled = false; }
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }
  play(name) {
    if (!this.enabled || !SOUND_DEFS[name]) return;
    this.ensure();
    if (!this.ctx) return;
    scheduleSound(this.buses, SOUND_DEFS[name].params, this.ctx.currentTime + 0.02);
  }
}

export class Player {
  constructor(stageEl, { onStep, onDone } = {}) {
    this.stage = stageEl;
    this.onStep = onStep || (() => {});
    this.onDone = onDone || (() => {});
    this.fx = new SoundFX();
    this.runId = 0;
    window.addEventListener('resize', () => this.layout());
  }

  load(scene) {
    this.scene = scene;
    this.fx.enabled = scene.sound !== false && scene.sound !== 'off';
    const frame = FRAMES[scene.frame] || FRAMES.browser;
    const t = scene.theme;
    const vars = `--p:${t.primary};--acc:${t.accent};--m-bg:${t.bg};--m-surface:${t.surface};--m-text:${t.text};--m-radius:${t.radius}px;--m-font:${t.font};`;

    let shell;
    if (scene.frame === 'phone') {
      shell = `
        <div class="frame phone" style="${vars}">
          <div class="fr-notch"></div>
          <div class="fr-statusbar"><span>9:41</span><span>📶 🔋</span></div>
          <div class="screen mock" style="${vars}"></div>
          <div class="fr-homebar"></div>
        </div>`;
    } else if (scene.frame === 'none') {
      shell = `<div class="frame bare" style="${vars}"><div class="screen mock" style="${vars}"></div></div>`;
    } else {
      const url = scene.url || `${(scene.content.brand || 'demo').toLowerCase().replace(/\s+/g, '')}.com`;
      shell = `
        <div class="frame browser" style="${vars}">
          <div class="fr-chrome">
            <span class="fr-dots"><i></i><i></i><i></i></span>
            <span class="fr-url">🔒 ${esc(url)}</span>
          </div>
          <div class="screen mock" style="${vars}"></div>
        </div>`;
    }

    this.stage.innerHTML = `
      <div class="scaler" style="width:${frame.w}px">
        ${shell}
        <div class="syn-cursor ${scene.cursor === 'none' ? 'hidden' : ''}" data-style="${scene.cursor || 'arrow'}">
          ${scene.cursor === 'hand' ? '👆' : `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L19 13.5 Z" fill="#fff" stroke="#1b1f29" stroke-width="1.6" stroke-linejoin="round"/></svg>`}
          <span class="syn-ripple"></span>
        </div>
        <div class="syn-toast" id="syn-toast"></div>
      </div>`;

    this.scaler = this.stage.querySelector('.scaler');
    this.root = this.stage.querySelector('.mock');
    this.cursor = this.stage.querySelector('.syn-cursor');
    this.root.__scene = scene;
    this.root.innerHTML = TEMPLATES[scene.template].build(scene);
    this.ops = TEMPLATES[scene.template].ops || {};
    this.frameDef = frame;
    this.layout();
    this.parkCursor();
  }

  layout() {
    if (!this.scaler || !this.frameDef) return;
    const pad = 8;
    const w = this.stage.clientWidth - pad;
    const h = this.stage.clientHeight - pad;
    const fitH = this.stage.dataset.fit === 'both';
    let k = w / this.frameDef.w;
    if (fitH && h > 40) k = Math.min(k, h / this.frameDef.h);
    k = Math.min(k, 1.15);
    this.k = k;
    this.scaler.style.transform = `scale(${k})`;
    this.scaler.style.transformOrigin = 'top left';
    this.scaler.style.height = `${this.frameDef.h}px`;
    this.stage.style.setProperty('--stage-h', `${this.frameDef.h * k}px`);
    if (fitH) this.scaler.style.marginLeft = `${Math.max(0, (w - this.frameDef.w * k) / 2)}px`;
  }

  // ── helpers ──
  sleep(ms) {
    const id = this.runId;
    return new Promise((r) => setTimeout(() => r(id === this.runId), ms));
  }
  pos(target) {
    const el = typeof target === 'string' ? this.root.querySelector(target) : target;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = this.scaler.getBoundingClientRect();
    return { el, x: (r.left + r.width / 2 - s.left) / this.k, y: (r.top + r.height * 0.6 - s.top) / this.k };
  }
  parkCursor() {
    this.cursor.style.transitionDuration = '0ms';
    this.cursor.style.transform = `translate(${this.frameDef.w * 0.72}px, ${this.frameDef.h * 0.8}px)`;
  }
  async moveTo(target, dur = 650) {
    const p = this.pos(target);
    if (!p) return null;
    this.cursor.style.transitionDuration = `${dur / this.scene.speed}ms`;
    this.cursor.style.transform = `translate(${p.x}px, ${p.y}px)`;
    p.el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    await this.sleep(dur / this.scene.speed + 40);
    return p;
  }
  clickPulse(el) {
    this.cursor.classList.remove('clicking'); void this.cursor.offsetWidth;
    this.cursor.classList.add('clicking');
    if (el) {
      el.classList.remove('pressed'); void el.offsetWidth;
      el.classList.add('pressed');
    }
    this.fx.play('tap');
  }
  toast(text) {
    const t = this.stage.querySelector('#syn-toast');
    t.textContent = text;
    t.classList.remove('show'); void t.offsetWidth;
    t.classList.add('show');
    this.fx.play('notify');
    setTimeout(() => t.classList.remove('show'), 2200 / this.scene.speed);
  }
  helpers() {
    return { toast: (t) => this.toast(t), sound: (n) => this.fx.play(n), root: this.root };
  }

  // ── step actions ──
  async runStep(step) {
    const sp = this.scene.speed || 1;
    switch (step.action) {
      case 'wait':
        return this.sleep((step.ms ?? 600) / sp);
      case 'move':
        return this.moveTo(step.target);
      case 'click': {
        const p = await this.moveTo(step.target);
        if (p) this.clickPulse(p.el);
        return this.sleep(260 / sp);
      }
      case 'type': {
        const p = await this.moveTo(step.target);
        if (!p) return;
        this.clickPulse(p.el);
        await this.sleep(180 / sp);
        let span = p.el.querySelector('.ti');
        if (!span) {
          span = document.createElement('span');
          span.className = 'ti';
          p.el.appendChild(span);
        }
        p.el.classList.add('filled', 'focus');
        const text = step.text || '';
        for (let i = 0; i < text.length; i++) {
          span.textContent = text.slice(0, i + 1);
          if (i % 2 === 0) this.fx.play('key');
          if (!(await this.sleep((30 + Math.random() * 55) / sp))) return false;
        }
        p.el.classList.remove('focus');
        return this.sleep(150 / sp);
      }
      case 'scroll': {
        const screen = this.stage.querySelector('.screen');
        screen.scrollBy({ top: step.y ?? 220, behavior: 'smooth' });
        return this.sleep(700 / sp);
      }
      case 'toast':
        this.toast(step.text || '✓');
        return this.sleep(900 / sp);
      case 'op': {
        const fn = this.ops[step.name];
        if (fn) fn(this.root, step.args || {}, this.helpers());
        return this.sleep(450 / sp);
      }
      default:
        return this.sleep(200);
    }
  }

  async play() {
    if (!this.scene) return;
    this.stop();
    const id = ++this.runId;
    this.load(this.scene); // fresh state every run
    this.fx.ensure();
    await this.sleep(60);
    const steps = this.scene.steps || [];
    for (let i = 0; i < steps.length; i++) {
      if (id !== this.runId) return;
      this.onStep(i, steps[i]);
      const ok = await this.runStep(steps[i]);
      if (ok === false || id !== this.runId) return;
    }
    this.onStep(-1, null);
    this.onDone();
    if (this.scene.loop === true || this.scene.loop === 'on') {
      await this.sleep(1400);
      if (id === this.runId) this.play();
    }
  }

  stop() {
    this.runId++;
    this.onStep(-1, null);
  }
}
