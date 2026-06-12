# Synth UI — synthetic UI demo builder

Prompt → **working, animated UI mockup** you can embed anywhere.

Describe an interaction in plain English — or just paste a website URL — and
Synth UI generates a *synthetic* product UI (the kind of polished fake-UI
demos you see on monday.com's marketing pages or claude.ai/design) and
choreographs it live: a virtual cursor moves, clicks, types; cards get added,
statuses flip, bots reply, modals open. Everything is real DOM rendered
in-browser — no screenshots, no video — and fully adjustable after generation.

**Live app:** https://pm101-co-uk.github.io/Synth-UI-Demo/

## What it does

1. **Prompt it** — e.g.
   - `https://monday.com` → fetches the site, extracts brand colors, name,
     nav and headline, and builds a themed landing-page mock with a
     click-the-CTA → signup-modal demo
   - `iPhone Telegram chat: type a message to the PM101 bot and it replies`
     → an iPhone-framed chat scene
   - `monday.com style kanban board where a task is added and marked Done`
   - `SaaS signup form demo` / `Analytics dashboard with animated charts`
2. **Watch it build** — live preview with an animated cursor (click ripples,
   real typing with a caret, scrolling, toasts), inside a browser-window,
   iPhone, or bare frame.
3. **Post-produce everything** — template, frame, brand name, primary/accent
   colors, dark mode, corner radius, font, playback speed, cursor style,
   sounds (synthesized UI sfx), looping. Each step of the choreography is
   editable: change typed text, reorder, remove, add new steps. Full scene
   JSON is exposed for total control.
4. **Embed anywhere** — *Copy embed* gives you an `<iframe>` snippet. The
   whole scene is serialized into the URL of the hosted `embed.html` player,
   so the live demo runs on any website with one paste. No backend.

## Templates

| Template | Demo choreography |
|---|---|
| 🌐 Website landing | scan nav → click CTA → signup modal → type email → success |
| 💬 Chat / bot | focus input → type → send → typing dots → bot reply |
| 📋 Kanban board | click "+ Add item" → type task → card appears → mark Done |
| 📝 Signup form | type name + email → submit → success state |
| 📈 Analytics dashboard | charts animate in → switch date range → data updates |

## URL analysis

Paste any address and Synth UI fetches the page (via a public CORS proxy,
since this is a fully static app), then extracts: site name, meta
description, `<h1>`, nav links, `theme-color`/dominant saturated colors, and
favicon — and themes the mock with them. If the fetch is blocked, it falls
back to a deterministic palette generated from the domain.

## Run locally

```bash
python3 -m http.server 8080   # or: npx serve .
```

Open <http://localhost:8080>. (ES modules need `http://`, not `file://`.)

## Project layout

```
index.html      editor (prompt, steps, preview, post production, JSON)
embed.html      standalone player — reads the scene from the URL hash
styles.css      editor chrome + device frames + mock component library
js/app.js       editor glue, settings UI, embed export, persistence
js/scenes.js    scene model, 5 mock templates + ops, prompt → scene generator
js/engine.js    player: cursor animation, step runner, frames, sound fx
js/analyze.js   website fetch + brand extraction (colors, name, nav, h1)
js/sounds.js    Web Audio synthesis engine for the optional UI sounds
```

Deployed automatically to GitHub Pages on every push to `main`.
