// Drives the iPhone / Telegram mockup so the visuals play in sync with the
// scheduled audio cues.

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export class Phone {
  constructor(root) {
    this.root = root;
    this.home = root.querySelector('.ph-home');
    this.chat = root.querySelector('.ph-chat');
    this.icon = root.querySelector('.ph-tg-icon');
    this.messages = root.querySelector('.ph-messages');
    this.draft = root.querySelector('.ph-draft');
    this.status = root.querySelector('.ph-bot-status');
    this.timers = [];
  }

  later(ms, fn) {
    this.timers.push(setTimeout(fn, ms));
  }

  reset() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.home.classList.add('active');
    this.chat.classList.remove('active');
    this.icon.classList.remove('ripple');
    this.messages.innerHTML = '';
    this.draft.textContent = '';
    this.draft.classList.add('placeholder');
    this.draft.textContent = 'Message';
    this.status.textContent = 'bot';
    this.lastOut = null;
  }

  // Plays one cue. `cue.at`/`cue.dur` are in seconds relative to scene start.
  play(cue, scene) {
    const ms = cue.at * 1000;
    switch (cue.type) {
      case 'tap':
        this.later(ms, () => {
          this.icon.classList.remove('ripple');
          void this.icon.offsetWidth; // restart animation
          this.icon.classList.add('ripple');
        });
        break;
      case 'appOpen':
        this.later(ms + 80, () => {
          this.home.classList.remove('active');
          this.chat.classList.add('active');
        });
        break;
      case 'typing': {
        const text = scene.message;
        const step = (cue.dur * 1000) / Math.max(1, text.length);
        this.later(ms, () => {
          this.draft.classList.remove('placeholder');
          this.draft.textContent = '';
        });
        for (let i = 0; i < text.length; i++) {
          this.later(ms + step * (i + 1), () => {
            this.draft.textContent = text.slice(0, i + 1);
          });
        }
        break;
      }
      case 'send':
        this.later(ms + 60, () => {
          this.lastOut = this.bubble('out', scene.message, '✓');
          this.draft.classList.add('placeholder');
          this.draft.textContent = 'Message';
        });
        break;
      case 'connect':
        this.later(ms, () => {
          this.status.textContent = 'connecting…';
          this.typingDots = this.bubble('in dots', '<span></span><span></span><span></span>');
        });
        break;
      case 'notify':
        this.later(ms + 40, () => {
          if (this.typingDots) { this.typingDots.remove(); this.typingDots = null; }
          this.status.textContent = 'online';
          this.bubble('in', scene.reply);
          if (this.lastOut) {
            const tick = this.lastOut.querySelector('.ticks');
            if (tick) tick.textContent = '✓✓';
          }
        });
        break;
      case 'success':
        this.later(ms, () => { this.status.textContent = 'online'; });
        break;
      case 'error':
        this.later(ms, () => { this.status.textContent = 'connection failed'; });
        break;
    }
  }

  bubble(cls, content, ticks) {
    const el = document.createElement('div');
    el.className = `ph-bubble ${cls}`;
    const safe = cls.includes('dots') ? content : escapeHtml(content);
    el.innerHTML = `<span class="txt">${safe}</span><span class="meta">9:41${ticks ? ` <span class="ticks">${ticks}</span>` : ''}</span>`;
    this.messages.appendChild(el);
    this.messages.scrollTop = this.messages.scrollHeight;
    return el;
  }

  playAll(cues, scene) {
    this.reset();
    cues.forEach((cue) => this.play(cue, scene));
  }
}
