// Client-side *preview* of what the `capture` function will do with a sentence, so
// the Toss In sheet can show the label as you type. The server stays authoritative.

export type Parsed = {
  thing: string;
  location: string | null;
  remindAt: Date | null;
  isSecret: boolean;
};

const SECRET = /\b(secret|private|confidential|don'?t tell)\b/i;
const LOCATION = /\b((?:in|on|under|inside|at|by|near|behind|beside|beneath)\s+.+?)[.!]?$/i;
const FILLER =
  /^(i put|i placed|i left|i stored|i hid|remind me to|remember to|don'?t forget to|note that|i need to)\s*/i;
const ARTICLE = /^(the|a|an|my|some|your|his|her|their)\s+/i;

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WHEN =
  /\b(today|tonight|tomorrow|(?:on\s+)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*)\b(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?|\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;

function extractWhen(text: string, now: Date): { remindAt: Date | null; rest: string } {
  const m = WHEN.exec(text);
  if (!m) return { remindAt: null, rest: text };

  const date = new Date(now);
  date.setSeconds(0, 0);
  const word = (m[1] ?? '').toLowerCase();
  const hourRaw = m[3] ?? m[6];
  const minRaw = m[4] ?? m[7];
  const meridiem = (m[5] ?? m[8])?.toLowerCase();

  if (word === 'tomorrow') date.setDate(date.getDate() + 1);
  else if (m[2]) {
    const target = DAYS.indexOf(m[2].toLowerCase());
    const delta = (target - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + delta);
  }

  let hour = hourRaw ? parseInt(hourRaw, 10) : word === 'tonight' ? 20 : 9;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  date.setHours(hour, minRaw ? parseInt(minRaw, 10) : 0, 0, 0);

  const rest = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim();
  return { remindAt: date, rest };
}

export function parseCapture(text: string, now: Date = new Date()): Parsed {
  const raw = text.trim();
  const isSecret = SECRET.test(raw);

  const { remindAt, rest } = extractWhen(raw, now);

  let location: string | null = null;
  let body = rest;
  const loc = LOCATION.exec(rest);
  if (loc && loc.index !== undefined) {
    location = loc[1].trim() || null;
    body = (rest.slice(0, loc.index) + rest.slice(loc.index + loc[0].length)).trim();
  }

  const thing = body
    .replace(SECRET, '')
    .replace(FILLER, '')
    .replace(ARTICLE, '')
    .replace(/[.!,\s]+$/, '')
    .trim();

  return { thing, location, remindAt, isSecret };
}
