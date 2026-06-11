// Oscilloscope + spectrum view of the master analyser, plus the timeline
// strip with a moving playhead.

import { EVENT_DEFS } from './sounds.js';

export class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.analyser = null;
    this.running = false;
  }

  attach(analyser) {
    this.analyser = analyser;
    this.timeData = new Uint8Array(analyser.fftSize);
    this.freqData = new Uint8Array(analyser.frequencyBinCount);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  draw() {
    const { canvas, g } = this;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0b1020';
    g.fillRect(0, 0, w, h);

    g.strokeStyle = 'rgba(110,140,200,0.12)';
    g.lineWidth = 1;
    for (let y = 0; y <= 4; y++) {
      g.beginPath(); g.moveTo(0, (h * y) / 4); g.lineTo(w, (h * y) / 4); g.stroke();
    }

    if (!this.analyser) return;
    const split = h * 0.52;

    // spectrum bars (bottom)
    this.analyser.getByteFrequencyData(this.freqData);
    const bars = 72;
    const bw = w / bars;
    for (let i = 0; i < bars; i++) {
      // log-ish bin spread so lows don't dominate
      const bin = Math.floor(Math.pow(i / bars, 1.6) * this.freqData.length * 0.72);
      const v = this.freqData[bin] / 255;
      const bh = v * (h - split - 6);
      const hue = 190 + (i / bars) * 110;
      g.fillStyle = `hsla(${hue}, 90%, ${45 + v * 25}%, 0.9)`;
      g.fillRect(i * bw + 1, h - bh, bw - 2, bh);
    }

    // oscilloscope (top)
    this.analyser.getByteTimeDomainData(this.timeData);
    g.beginPath();
    g.strokeStyle = '#5eead4';
    g.lineWidth = 1.6;
    g.shadowColor = '#5eead4';
    g.shadowBlur = 6;
    for (let i = 0; i < this.timeData.length; i++) {
      const x = (i / this.timeData.length) * w;
      const y = 4 + ((this.timeData[i] / 255) * (split - 8));
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
    g.shadowBlur = 0;
  }
}

export function renderTimeline(container, cues, total) {
  container.querySelectorAll('.tl-block').forEach((el) => el.remove());
  for (const cue of cues) {
    const def = EVENT_DEFS[cue.type];
    const el = document.createElement('div');
    el.className = 'tl-block';
    el.style.left = `${(cue.at / total) * 100}%`;
    el.style.width = `calc(${(cue.dur / total) * 100}% - 2px)`;
    el.style.setProperty('--c', def.color);
    el.innerHTML = `<span>${def.icon}</span><small>${def.label}</small>`;
    el.title = `${def.label} @ ${cue.at.toFixed(2)}s`;
    container.appendChild(el);
  }
}

export function animatePlayhead(playhead, ctx, t0, total, isStopped) {
  const loop = () => {
    if (isStopped()) { playhead.style.opacity = '0'; return; }
    const elapsed = ctx.currentTime - t0;
    if (elapsed >= total) { playhead.style.opacity = '0'; return; }
    playhead.style.opacity = '1';
    playhead.style.left = `${Math.max(0, (elapsed / total) * 100)}%`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
