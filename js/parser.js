// Turns a natural-language scene description into an ordered list of
// timeline events, preserving the order things are mentioned in the prompt.

const RULES = [
  { type: 'tap',     re: /\b(tap|click|press|touch)\w*/g },
  { type: 'appOpen', re: /\b(open|launch|telegram|whatsapp|app)\w*/g },
  { type: 'typing',  re: /\b(typ|input|enter|writ|keyboard)\w*/g },
  { type: 'send',    re: /\b(send|sent|submit)\w*/g },
  { type: 'connect', re: /\b(connect|sync|load|fetch|request|search|quer)\w*/g },
  { type: 'notify',  re: /\b(receiv|repl|return|respon|notif|incoming|result|information|answer|message back)\w*/g },
  { type: 'success', re: /\b(success|done|complet|confirm|finish)\w*/g },
  { type: 'error',   re: /\b(error|fail|wrong|reject)\w*/g },
];

export const DEFAULT_PROMPT =
  'Tap the Telegram app on the iPhone, type a message, send it to the PM101 bot, ' +
  'connecting… then it returns the relevant information.';

export function parsePrompt(text) {
  const lower = (text || '').toLowerCase();
  const hits = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(lower)) !== null) {
      hits.push({ type: rule.type, index: m.index });
    }
  }
  hits.sort((a, b) => a.index - b.index);

  const events = [];
  for (const h of hits) {
    if (events.length && events[events.length - 1].type === h.type) continue;
    events.push({ type: h.type });
    if (events.length >= 16) break;
  }

  // A bot conversation implies a round-trip even if not spelled out.
  if (/\b(bot|pm101)\b/.test(lower)) {
    if (!events.some((e) => e.type === 'connect') && !events.some((e) => e.type === 'notify')) {
      events.push({ type: 'connect' }, { type: 'notify' });
    }
  }

  if (!events.length) {
    return ['tap', 'appOpen', 'typing', 'send', 'connect', 'notify'].map((type) => ({ type }));
  }
  return events;
}
