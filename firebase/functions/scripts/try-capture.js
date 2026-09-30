// Dry run of `capture` + `recall` for one phrase: no emulator, no database, no API key.
//
//   npm run try -- "Sam is Ella's friend from soccer"
//   npm run try -- "Sam is Ella's friend" --claude '{"kind":"person","thing":"Sam","detail":"Ella'\''s friend"}'
//   npm run try -- --prompt        # print the exact prompt the Claude step uses
//
// Without --claude it shows the free (regex) path, which is what runs when no
// ANTHROPIC_API_KEY is set. With --claude it treats that JSON as the model's reply, runs
// it through the same validation, and shows what would be stored. Options: --tz <IANA>,
// --secret.

const { analyze, parseExtraction, CLASSIFY_PROMPT } = require("../lib/capture");
const { speakItem } = require("../lib/recall");

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args.splice(i, 2)[1];
};
const bool = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};

if (bool("--prompt")) {
  console.log(CLASSIFY_PROMPT);
  process.exit(0);
}

const claudeRaw = flag("--claude");
const timeZone = flag("--tz") || "America/Los_Angeles";
const secretFlag = bool("--secret");
const text = args.join(" ").trim();
if (!text) {
  console.error('usage: npm run try -- "phrase" [--claude \'{"kind":...}\'] [--tz Zone] [--secret]');
  process.exit(1);
}

const claude = claudeRaw ? parseExtraction(claudeRaw) : null;
if (claudeRaw && !claude) console.log("(--claude JSON was invalid; capture would fall back to the free path)\n");

const r = analyze(text, timeZone, claude);
const isSecret = secretFlag || /\b(secret|private|confidential|don'?t tell)\b/i.test(text);
const stored = {
  kind: r.kind,
  thing: r.thing,
  rawText: text,
  location: r.location,
  detail: r.kind === "stash" ? null : r.detail,
  remindAt: r.remindAt ? r.remindAt.toISOString() : null,
  isSecret,
  extractedBy: r.extractedBy,
};

console.log("STORED IN FIRESTORE");
console.log(JSON.stringify(stored, null, 2));
console.log("\nCAPTURE SAYS");
console.log(isSecret ? "Got it. Saved as private." : r.kind === "person" ? `Got it, ${r.thing}${r.detail ? `: ${r.detail}` : ""}.` : `Got it, noted: ${r.thing}.`);
console.log("\nRECALL WOULD SAY");
console.log(
  isSecret
    ? "That's something you marked private. Check your phone for the details.  (and flags it unread)"
    : speakItem({ ...stored })
);
