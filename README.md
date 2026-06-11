# Synth UI Demo

A prompt-driven **UI sound scene designer**. Describe an interaction in plain
English — e.g. *"tap the Telegram app on the iPhone, type a message, send it to
the PM101 bot, connecting… then it returns the relevant information"* — and the
app builds a timeline of fully synthesized UI sounds, plays them in sync with an
animated iPhone/Telegram mockup, and gives you full post-production control over
every sound.

Everything is generated in-browser with the **Web Audio API** — no samples, no
dependencies, no build step.

![Sections](#) <!-- open index.html and press ▶ Play scene -->

## Run it

Any static file server works (ES modules need `http://`, not `file://`):

```bash
python3 -m http.server 8080
# or: npx serve .
```

Then open <http://localhost:8080>.

## How it works

1. **Describe the scene** — type a prompt and hit **⚡ Build timeline**. A
   keyword parser turns the narrative into ordered events (tap, app open,
   typing, send, connecting, bot reply, success, error), preserving the order
   they're mentioned. Mentioning a *bot* / *pm101* implies a connect→reply
   round-trip automatically.
2. **Scene script** — edit the message typed on the phone and the PM101 bot's
   reply. The typing sound length follows the message length.
3. **Timeline events** — click a chip to audition it, ✕ to remove, or add more
   from the palette.
4. **Output monitor** — laid-out timeline with a moving playhead, plus a live
   oscilloscope and spectrum analyser of the master output.
5. **Post production** — every sound has fully adjustable synthesis params
   (waveform, pitch + sweep, arpeggio, ADSR, noise mix, filter, pan, FX sends,
   humanize). The **Master FX** tab has volume, scene speed, reverb, ping
   delay, 3-band EQ and a compressor — master tweaks apply live while playing.
   Tweaks auto-preview on release so you hear changes as you build.
6. **Scene preview** — an iPhone mockup plays the whole story in sync: tap
   ripple on the Telegram icon → app opens → message types out → sends →
   "PM101 Bot typing…" → reply bubble with the relevant information.
7. **⬇ Export WAV** — renders the scene offline (including reverb tail) to a
   16-bit stereo WAV.

Settings persist in `localStorage`; use **⟲ Reset everything** to get back to
factory defaults.

## Sound palette

| Sound | Character |
|---|---|
| 👆 UI Tap | short sine "tock" with noise transient + pitch drop |
| 📱 App Open | band-passed noise/triangle swoosh sweeping up |
| ⌨️ Keyboard Key | high-passed noise click, heavily humanized |
| 🛫 Send Swoosh | rising sine sweep, Telegram-style |
| 📡 Connecting Blips | resonant square blip arpeggio with delay send |
| 💬 Bot Reply | two-note sine chime (notification) |
| ✅ Success Chime | major arpeggio with reverb |
| ⛔ Error Buzz | falling sawtooth buzz |

## Project layout

```
index.html        layout + iPhone mockup markup
styles.css        dark studio theme
js/app.js         state, settings UI, transport, persistence
js/sounds.js      synthesis engine, sound/event definitions, master FX chain
js/parser.js      prompt → timeline event parser
js/phone.js       iPhone/Telegram mockup animation driver
js/visualizer.js  oscilloscope + spectrum + timeline strip
js/wav.js         offline render + WAV encoder
```
