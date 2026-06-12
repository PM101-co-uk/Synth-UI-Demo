// Fetches a target website (via a public CORS proxy, since this is a static
// app) and extracts enough brand signal to theme a synthetic UI: name, nav,
// headline, description, dominant colors, favicon.

const PROXIES = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
];

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function pickBrandColors(html) {
  const counts = new Map();
  const re = /#([0-9a-fA-F]{6})\b/g;
  let m;
  let guard = 0;
  while ((m = re.exec(html)) !== null && guard++ < 20000) {
    const hex = `#${m[1].toLowerCase()}`;
    counts.set(hex, (counts.get(hex) || 0) + 1);
  }
  const scored = [];
  for (const [hex, n] of counts) {
    const { s, l } = hexToHsl(hex);
    if (s < 0.3 || l > 0.88 || l < 0.14) continue; // skip grays / near-white / near-black
    scored.push({ hex, score: s * Math.log2(1 + n) });
  }
  scored.sort((a, b) => b.score - a.score);
  const primary = scored[0]?.hex || null;
  let accent = null;
  if (primary) {
    const ph = hexToHsl(primary).h;
    accent = scored.find((c) => {
      const dh = Math.abs(hexToHsl(c.hex).h - ph);
      return Math.min(dh, 360 - dh) > 40;
    })?.hex || scored[1]?.hex || null;
  }
  return { primary, accent };
}

export async function analyzeSite(rawUrl) {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  let html = null, lastErr;
  for (const prox of PROXIES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(prox(url), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
      if (html && html.length > 200) break;
      html = null;
    } catch (e) { lastErr = e; }
  }
  if (!html) throw lastErr || new Error('Could not fetch site');

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = (sel, attr = 'content') => doc.querySelector(sel)?.getAttribute(attr)?.trim() || null;

  const title = (doc.querySelector('title')?.textContent || '').trim() || null;
  const siteName = meta('meta[property="og:site_name"]') || null;
  const desc = meta('meta[name="description"]') || meta('meta[property="og:description"]') || null;
  const themeColor = meta('meta[name="theme-color"]');
  const h1 = (doc.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim() || null;

  const navLinks = [...doc.querySelectorAll('nav a, header a')]
    .map((a) => a.textContent.replace(/\s+/g, ' ').trim())
    .filter((t) => t.length >= 2 && t.length <= 18 && !/^(http|www\.)/i.test(t));
  const nav = [...new Set(navLinks)].slice(0, 5);

  let favicon = meta('link[rel*="icon"]', 'href');
  if (favicon && !/^https?:\/\//i.test(favicon)) {
    try { favicon = new URL(favicon, url).href; } catch { favicon = null; }
  }

  const colors = pickBrandColors(html);
  const primary = (themeColor && /^#[0-9a-fA-F]{6}$/.test(themeColor) ? themeColor : null) || colors.primary;

  return {
    title, siteName, desc, h1, nav, favicon,
    primary, accent: colors.accent,
    domain: new URL(url).hostname.replace(/^www\./, ''),
  };
}

// Merges analysis results into a generated landing scene in-place.
export function applyAnalysis(scene, a) {
  const t = scene.theme, c = scene.content;
  if (a.primary) t.primary = a.primary;
  if (a.accent) t.accent = a.accent;
  if (a.favicon) t.logo = a.favicon;
  const brand = a.siteName || a.domain || c.brand;
  c.brand = brand;
  if (scene.template === 'landing') {
    if (a.h1 && a.h1.length <= 90) c.h1 = a.h1;
    else if (a.title) c.h1 = a.title.split(/[|·–—-]/)[0].trim().slice(0, 90);
    if (a.desc) c.sub = a.desc.slice(0, 140);
    if (a.nav?.length >= 2) c.nav = a.nav;
  }
  if (scene.template === 'chat') c.botName = `${brand} Assistant`;
  scene.meta.analyzed = a.domain;
}
