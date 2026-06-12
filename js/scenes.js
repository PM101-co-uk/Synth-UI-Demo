// Scene model, mock UI templates, and prompt → scene generation.
// A "scene" is a plain JSON object: template + frame + theme + content + steps.
// Templates build the mock DOM (as HTML) and expose named ops that steps can
// trigger (add a card, bot reply, open a modal, …).

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const FONTS = [
  { label: 'Modern sans', value: "'Segoe UI', system-ui, -apple-system, sans-serif" },
  { label: 'Humanist serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Rounded', value: "'Comic Sans MS', 'Trebuchet MS', sans-serif" },
  { label: 'Mono', value: "'Cascadia Code', 'Fira Code', monospace" },
];

export const FRAMES = {
  browser: { label: 'Browser window', w: 960, h: 620 },
  phone:   { label: 'iPhone',         w: 340, h: 680 },
  none:    { label: 'Bare panel',     w: 860, h: 560 },
};

const BRAND_THEMES = {
  monday:   { primary: '#6161ff', accent: '#00c875' },
  claude:   { primary: '#d97757', accent: '#bd5d3a', bg: '#faf9f5', surface: '#ffffff', text: '#3d3929', font: FONTS[1].value },
  telegram: { primary: '#2aabee', accent: '#2aabee' },
  anthropic:{ primary: '#d97757', accent: '#bd5d3a', bg: '#faf9f5', surface: '#ffffff', text: '#3d3929', font: FONTS[1].value },
};

export function defaultTheme() {
  return {
    primary: '#6161ff', accent: '#00c875',
    bg: '#f4f5f8', surface: '#ffffff', text: '#23262f',
    dark: false, radius: 10, font: FONTS[0].value,
  };
}

export const DARK_SET  = { bg: '#10131c', surface: '#1a1f2c', text: '#e7eaf3' };
export const LIGHT_SET = { bg: '#f4f5f8', surface: '#ffffff', text: '#23262f' };

export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

// Deterministic palette for a domain we haven't analyzed (yet).
export function hashPalette(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return { primary: hslToHex(hue, 68, 50), accent: hslToHex((hue + 140) % 360, 62, 46) };
}

const logoHtml = (theme, brand) => theme.logo
  ? `<img class="mk-logo-img" src="${esc(theme.logo)}" alt="">`
  : `<span class="mk-logo-dot"></span>`;

// ───────────────────────── Templates ─────────────────────────

export const TEMPLATES = {

  kanban: {
    label: 'Kanban board', icon: '📋', defaultFrame: 'browser',
    defaultContent: (brand) => ({
      brand: brand || 'monday.com',
      board: 'Q3 Roadmap',
      newCard: 'Build synthetic UI demo',
      columns: [
        { name: 'Backlog',       color: '#c4c4c4', cards: [{ t: 'Customer interviews', s: 'Backlog' }, { t: 'Pricing page refresh', s: 'Backlog' }] },
        { name: 'Working on it', color: '#fdab3d', cards: [{ t: 'Mobile onboarding flow', s: 'Working' }, { t: 'API rate limiting', s: 'Working' }] },
        { name: 'Done',          color: '#00c875', cards: [{ t: 'SSO integration', s: 'Done' }] },
      ],
    }),
    defaultSteps: (c) => [
      { action: 'wait', ms: 500 },
      { action: 'click', target: '#mk-input', label: 'Click “+ Add item”' },
      { action: 'type', target: '#mk-input', text: c.newCard, label: 'Type the new task' },
      { action: 'op', name: 'addCard', label: 'Add card to board' },
      { action: 'wait', ms: 350 },
      { action: 'click', target: '#mk-newcard .mk-chip', label: 'Click its status' },
      { action: 'op', name: 'setStatus', args: { status: 'Done' }, label: 'Mark as Done' },
      { action: 'toast', text: 'Saved ✓', label: 'Toast: saved' },
    ],
    build(scene) {
      const c = scene.content;
      const chip = (s) => `<span class="mk-chip" data-s="${esc(s)}" style="--chip:${STATUS_COLORS[s] || '#c4c4c4'}">${esc(s)}</span>`;
      const card = (cd, id = '') => `<div class="mk-card" ${id ? `id="${id}"` : ''}><span class="mk-card-t">${esc(cd.t)}</span>${chip(cd.s)}</div>`;
      return `
        <div class="mk-topbar">
          <span class="mk-logo">${logoHtml(scene.theme)}<b>${esc(c.brand)}</b></span>
          <span class="mk-search">🔍 Search</span>
          <span class="mk-avatar">A</span>
        </div>
        <div class="mk-board">
          <h3 class="mk-board-title">${esc(c.board)}</h3>
          <div class="mk-cols">
            ${c.columns.map((col, i) => `
              <div class="mk-col">
                <div class="mk-col-head" style="--col:${col.color}">${esc(col.name)} <i>${col.cards.length}</i></div>
                ${col.cards.map((cd) => card(cd)).join('')}
                ${i === 0 ? `<div class="mock-input" id="mk-input" data-placeholder="+ Add item"></div>` : ''}
              </div>`).join('')}
          </div>
        </div>`;
    },
    ops: {
      addCard(root, args, h) {
        const text = root.querySelector('#mk-input .ti')?.textContent || args.text || 'New item';
        const input = root.querySelector('#mk-input');
        input.innerHTML = ''; input.classList.remove('filled');
        const el = document.createElement('div');
        el.className = 'mk-card pop'; el.id = 'mk-newcard';
        el.innerHTML = `<span class="mk-card-t">${esc(text)}</span><span class="mk-chip" data-s="Backlog" style="--chip:#c4c4c4">Backlog</span>`;
        input.before(el);
        h.sound('send');
      },
      setStatus(root, args, h) {
        const chipEl = root.querySelector('#mk-newcard .mk-chip') || root.querySelector('.mk-chip');
        const s = args.status || 'Done';
        chipEl.textContent = s;
        chipEl.style.setProperty('--chip', STATUS_COLORS[s] || '#00c875');
        chipEl.classList.remove('pop'); void chipEl.offsetWidth; chipEl.classList.add('pop');
        h.sound('success');
      },
    },
  },

  chat: {
    label: 'Chat / bot', icon: '💬', defaultFrame: 'browser',
    defaultContent: (brand) => ({
      brand: brand || 'Assistant',
      botName: brand ? `${brand} Bot` : 'Assistant',
      greeting: 'Hi! How can I help you today?',
      userMsg: "What's the latest status update?",
      reply: '📊 All systems nominal — 3 new updates are ready for review.',
    }),
    defaultSteps: (c) => [
      { action: 'wait', ms: 500 },
      { action: 'click', target: '#ch-input', label: 'Focus the message box' },
      { action: 'type', target: '#ch-input', text: c.userMsg, label: 'Type the message' },
      { action: 'click', target: '#ch-send', label: 'Hit send' },
      { action: 'op', name: 'send', label: 'Message appears' },
      { action: 'op', name: 'typing', label: 'Bot is typing…' },
      { action: 'wait', ms: 1100 },
      { action: 'op', name: 'reply', label: 'Bot replies' },
    ],
    build(scene) {
      const c = scene.content;
      return `
        <div class="ch-wrap">
          <div class="ch-head">
            <span class="ch-avatar">${esc((c.botName || 'A')[0])}</span>
            <span class="ch-title"><b>${esc(c.botName)}</b><small id="ch-status">online</small></span>
          </div>
          <div class="ch-msgs" id="ch-msgs">
            <div class="ch-bubble in">${esc(c.greeting)}</div>
          </div>
          <div class="ch-bar">
            <div class="mock-input" id="ch-input" data-placeholder="Message"></div>
            <button class="ch-send" id="ch-send">➤</button>
          </div>
        </div>`;
    },
    ops: {
      send(root, args, h) {
        const input = root.querySelector('#ch-input');
        const text = input.querySelector('.ti')?.textContent || args.text || '…';
        input.innerHTML = ''; input.classList.remove('filled');
        const el = document.createElement('div');
        el.className = 'ch-bubble out pop';
        el.textContent = text;
        root.querySelector('#ch-msgs').appendChild(el);
        scrollChat(root);
        h.sound('send');
      },
      typing(root) {
        const el = document.createElement('div');
        el.className = 'ch-bubble in dots';
        el.innerHTML = '<span></span><span></span><span></span>';
        root.querySelector('#ch-msgs').appendChild(el);
        const st = root.querySelector('#ch-status');
        if (st) st.textContent = 'typing…';
        scrollChat(root);
      },
      reply(root, args, h) {
        root.querySelector('.ch-bubble.dots')?.remove();
        const el = document.createElement('div');
        el.className = 'ch-bubble in pop';
        el.textContent = args.text || root.__scene?.content.reply || 'Done!';
        root.querySelector('#ch-msgs').appendChild(el);
        const st = root.querySelector('#ch-status');
        if (st) st.textContent = 'online';
        scrollChat(root);
        h.sound('notify');
      },
    },
  },

  form: {
    label: 'Signup form', icon: '📝', defaultFrame: 'browser',
    defaultContent: (brand) => ({
      brand: brand || 'Acme',
      heading: 'Create your account',
      sub: 'Start your 14-day free trial — no credit card needed.',
      fields: [
        { id: 'f-name', label: 'Full name', value: 'Alex Morgan' },
        { id: 'f-email', label: 'Work email', value: 'alex@company.com' },
      ],
      cta: 'Get started',
    }),
    defaultSteps: (c) => [
      { action: 'wait', ms: 500 },
      ...c.fields.flatMap((f) => [
        { action: 'click', target: `#${f.id}`, label: `Click “${f.label}”` },
        { action: 'type', target: `#${f.id}`, text: f.value, label: `Type ${f.label.toLowerCase()}` },
      ]),
      { action: 'click', target: '#f-cta', label: 'Click the CTA' },
      { action: 'op', name: 'success', label: 'Show success state' },
      { action: 'toast', text: 'Account created 🎉', label: 'Toast' },
    ],
    build(scene) {
      const c = scene.content;
      return `
        <div class="fm-stage">
          <div class="fm-card" id="fm-card">
            <span class="mk-logo center">${logoHtml(scene.theme)}<b>${esc(c.brand)}</b></span>
            <h3>${esc(c.heading)}</h3>
            <p class="fm-sub">${esc(c.sub)}</p>
            ${c.fields.map((f) => `
              <label class="fm-label">${esc(f.label)}
                <div class="mock-input" id="${esc(f.id)}" data-placeholder="${esc(f.label)}"></div>
              </label>`).join('')}
            <button class="fm-cta" id="f-cta">${esc(c.cta)}</button>
          </div>
        </div>`;
    },
    ops: {
      success(root, args, h) {
        const card = root.querySelector('#fm-card');
        card.innerHTML = `<div class="fm-success pop"><span class="fm-check">✓</span><h3>You're in!</h3><p class="fm-sub">Welcome aboard — check your inbox to confirm.</p></div>`;
        h.sound('success');
      },
    },
  },

  dashboard: {
    label: 'Analytics dashboard', icon: '📈', defaultFrame: 'browser',
    defaultContent: (brand) => ({
      brand: brand || 'Insights',
      title: 'Revenue overview',
      range: 'Last 30 days', range2: 'Last 90 days',
      kpis: [
        { label: 'MRR', val: '$48.2k', delta: '+12%' },
        { label: 'Active users', val: '12,940', delta: '+8%' },
        { label: 'Churn', val: '1.8%', delta: '−0.4%' },
      ],
      bars:  [42, 65, 50, 78, 58, 88, 70, 95, 62, 80],
      bars2: [55, 48, 72, 60, 84, 66, 92, 74, 98, 86],
    }),
    defaultSteps: (c) => [
      { action: 'wait', ms: 400 },
      { action: 'op', name: 'countUp', label: 'Charts animate in' },
      { action: 'wait', ms: 1200 },
      { action: 'click', target: '#db-range', label: 'Change date range' },
      { action: 'op', name: 'switchData', label: 'Data updates' },
      { action: 'toast', text: 'Range updated', label: 'Toast' },
    ],
    build(scene) {
      const c = scene.content;
      return `
        <div class="mk-topbar">
          <span class="mk-logo">${logoHtml(scene.theme)}<b>${esc(c.brand)}</b></span>
          <span class="db-range" id="db-range">${esc(c.range)} ▾</span>
          <span class="mk-avatar">A</span>
        </div>
        <div class="db-body">
          <h3 class="mk-board-title">${esc(c.title)}</h3>
          <div class="db-kpis">
            ${c.kpis.map((k) => `<div class="db-kpi"><small>${esc(k.label)}</small><b>${esc(k.val)}</b><i>${esc(k.delta)}</i></div>`).join('')}
          </div>
          <div class="db-chart" id="db-chart">
            ${c.bars.map((v) => `<div class="db-bar" data-v="${v}" style="height:0%"></div>`).join('')}
          </div>
        </div>`;
    },
    ops: {
      countUp(root, args, h) {
        root.querySelectorAll('.db-bar').forEach((b, i) => {
          setTimeout(() => { b.style.height = `${b.dataset.v}%`; }, i * 60);
        });
        h.sound('appOpen');
      },
      switchData(root, args, h) {
        const c = root.__scene.content;
        root.querySelector('#db-range').textContent = `${c.range2} ▾`;
        root.querySelectorAll('.db-bar').forEach((b, i) => {
          b.style.height = `${c.bars2[i % c.bars2.length]}%`;
        });
        h.sound('connect');
      },
    },
  },

  landing: {
    label: 'Website landing', icon: '🌐', defaultFrame: 'browser',
    defaultContent: (brand) => ({
      brand: brand || 'Acme',
      nav: ['Product', 'Pricing', 'Docs', 'Blog'],
      h1: 'Work moves faster here',
      sub: 'The platform teams use to plan, track and ship — together.',
      cta: 'Get started',
      cards: ['Automations', 'Dashboards', 'Integrations'],
      email: 'alex@company.com',
    }),
    defaultSteps: (c) => [
      { action: 'wait', ms: 600 },
      { action: 'move', target: '.ld-nav a', label: 'Glance at the nav' },
      { action: 'click', target: '#ld-cta', label: 'Click the CTA' },
      { action: 'op', name: 'openModal', label: 'Signup modal opens' },
      { action: 'click', target: '#ld-email', label: 'Click email field' },
      { action: 'type', target: '#ld-email', text: c.email, label: 'Type email' },
      { action: 'click', target: '#ld-submit', label: 'Submit' },
      { action: 'op', name: 'modalSuccess', label: 'Success state' },
      { action: 'toast', text: "You're on the list 🎉", label: 'Toast' },
    ],
    build(scene) {
      const c = scene.content;
      return `
        <div class="ld-nav">
          <span class="mk-logo">${logoHtml(scene.theme)}<b>${esc(c.brand)}</b></span>
          <nav>${c.nav.map((n) => `<a>${esc(n)}</a>`).join('')}</nav>
          <button class="ld-navcta">${esc(c.cta)}</button>
        </div>
        <div class="ld-hero">
          <h1>${esc(c.h1)}</h1>
          <p>${esc(c.sub)}</p>
          <button class="fm-cta ld-cta" id="ld-cta">${esc(c.cta)} →</button>
        </div>
        <div class="ld-cards">
          ${c.cards.map((t) => `<div class="ld-card"><span class="ld-card-dot"></span><b>${esc(t)}</b><small>Lorem ipsum dolor sit amet, consectetur adipiscing.</small></div>`).join('')}
        </div>
        <div class="ld-modal" id="ld-modal">
          <div class="fm-card" id="ld-modal-card">
            <h3>Join ${esc(c.brand)}</h3>
            <p class="fm-sub">Enter your email to get started.</p>
            <div class="mock-input" id="ld-email" data-placeholder="you@company.com"></div>
            <button class="fm-cta" id="ld-submit">${esc(c.cta)}</button>
          </div>
        </div>`;
    },
    ops: {
      openModal(root, args, h) {
        root.querySelector('#ld-modal').classList.add('open');
        h.sound('appOpen');
      },
      modalSuccess(root, args, h) {
        root.querySelector('#ld-modal-card').innerHTML =
          `<div class="fm-success pop"><span class="fm-check">✓</span><h3>You're on the list!</h3><p class="fm-sub">We'll be in touch shortly.</p></div>`;
        h.sound('success');
      },
    },
  },
};

const STATUS_COLORS = { Backlog: '#c4c4c4', Working: '#fdab3d', Done: '#00c875', Stuck: '#e2445c' };

function scrollChat(root) {
  const m = root.querySelector('#ch-msgs');
  if (m) m.scrollTop = m.scrollHeight;
}

// ───────────────────────── Prompt → scene ─────────────────────────

export const DEFAULT_PROMPT =
  'iPhone Telegram chat: type a message to the PM101 bot and it replies with the relevant information';

export const EXAMPLES = [
  'https://monday.com',
  'iPhone Telegram chat: type a message to the PM101 bot and it replies with the relevant information',
  'monday.com style kanban board where a task is added and marked Done',
  'claude.ai style assistant chat answering "Summarise this quarter"',
  'SaaS signup form demo',
  'Analytics dashboard with animated charts',
];

export function extractUrl(text) {
  const m = (text || '').match(/\bhttps?:\/\/[^\s)"]+|\b(?:[a-z0-9-]+\.)+(?:com|co\.uk|org|net|io|ai|app|dev|design)\b(?:\/[^\s)"]*)?/i);
  return m ? m[0].replace(/^https?:\/\//i, '').replace(/\/+$/, '') : null;
}

export function generateScene(prompt) {
  const p = (prompt || '').trim();
  const lower = p.toLowerCase();
  const url = extractUrl(p);
  const has = (re) => re.test(lower);

  let template;
  if (has(/dashboard|chart|analytic|kpi|metric|graph|report/)) template = 'dashboard';
  else if (has(/kanban|\bboard\b|sprint|roadmap|backlog|task/)) template = 'kanban';
  else if (has(/chat|bot\b|messag|assistant|support|telegram|whatsapp|claude|repl(y|ies)/)) template = 'chat';
  else if (has(/\bform|sign ?up|log ?in|checkout|register|onboard/)) template = 'form';
  else template = 'landing';

  const frame = (template === 'chat' && has(/iphone|phone|mobile|telegram|whatsapp|ios|android|\bapp\b/))
    ? 'phone'
    : TEMPLATES[template].defaultFrame;

  // Brand + theme
  const theme = defaultTheme();
  let brand = null;
  const domain = url ? url.split('/')[0] : null;
  if (domain) {
    brand = domain.replace(/^www\./, '');
    const key = Object.keys(BRAND_THEMES).find((k) => brand.includes(k));
    Object.assign(theme, key ? BRAND_THEMES[key] : hashPalette(brand));
  } else {
    const key = Object.keys(BRAND_THEMES).find((k) => lower.includes(k));
    if (key) {
      Object.assign(theme, BRAND_THEMES[key]);
      brand = key === 'monday' ? 'monday.com' : key[0].toUpperCase() + key.slice(1);
    }
  }

  const content = TEMPLATES[template].defaultContent(brand);

  // Quoted text in the prompt becomes the typed message / new card / headline.
  const q = p.match(/"([^"]{2,90})"|'([^']{2,90})'|“([^”]{2,90})”/);
  const quoted = q ? (q[1] || q[2] || q[3]) : null;
  if (quoted) {
    if (template === 'chat') content.userMsg = quoted;
    else if (template === 'kanban') content.newCard = quoted;
    else if (template === 'landing') content.h1 = quoted;
    else if (template === 'dashboard') content.title = quoted;
  }
  if (template === 'chat' && has(/pm101/)) {
    content.botName = 'PM101 Bot';
    content.brand = 'PM101';
    content.greeting = 'Hi! Ask me anything about PM101.';
    content.reply = '📊 PM101: All systems nominal — 3 new updates ready · latency 42ms.';
    if (frame === 'phone' && !domain) Object.assign(theme, BRAND_THEMES.telegram);
  }

  return {
    meta: { title: p.slice(0, 80) || TEMPLATES[template].label },
    template, frame, url: url || '',
    theme, content,
    steps: TEMPLATES[template].defaultSteps(content),
    speed: 1, cursor: 'arrow', sound: true, loop: false,
  };
}
