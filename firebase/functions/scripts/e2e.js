// End-to-end API test against the LOCAL emulator (or any deployed BASE).
//
//   npm run e2e         (from the repo root, with `npm run backend` running)
//
// Creates a fresh user via /signup each run, so it never touches seeded data.

const BASE = process.env.BASE || "http://127.0.0.1:5002/demo-reminders/us-west3";
const PIN = "4321";

let failures = 0;
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  ${detail}`}`);
  if (!cond) failures++;
};

async function call(fn, { key, pin, body } = {}) {
  const headers = { "content-type": "application/json" };
  if (key) headers["x-app-key"] = key;
  if (pin) headers["x-tin-pin"] = pin;
  const res = await fetch(`${BASE}/${fn}`, { method: "POST", headers, body: JSON.stringify(body ?? {}) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
}

async function main() {
  // signup
  const bad = await call("signup", { body: { pin: "12" } });
  check("signup rejects a bad pin", bad.status === 400, bad.text);
  const su = await call("signup", { body: { name: "E2E", timezone: "America/Los_Angeles", pin: PIN } });
  const key = su.json?.api_key;
  check("signup returns an api_key", su.status === 200 && !!key, su.text);
  if (!key) return;

  // auth
  check("items rejects a missing key", (await call("items")).status === 401);
  check("items rejects a wrong key", (await call("items", { key: "nope" })).status === 401);

  // capture
  const c1 = await call("capture", { key, body: { text: "I put the keys in the hall closet" } });
  check("capture stores a location note", c1.status === 200 && c1.json?.item?.thing === "keys", c1.text);
  check("capture parses the location", /hall closet/.test(c1.json?.item?.location ?? ""), c1.text);

  const c2 = await call("capture", { key, body: { text: "remind me to call the dentist tomorrow at 9am" } });
  check("capture parses a reminder time", !!c2.json?.item?.remindAt, c2.text);

  const c3 = await call("capture", { key, body: { text: "spare key under the fern pot", secret: true } });
  check("capture honours secret:true", c3.json?.item?.isSecret === true, c3.text);
  const secretId = c3.json?.item?.id;

  // list, locked
  const locked = await call("items", { key });
  const lockedItems = locked.json?.items ?? [];
  check("items lists everything, newest first", lockedItems.length === 3 && lockedItems[0].id === secretId, locked.text);
  const redacted = lockedItems.find((i) => i.id === secretId);
  check(
    "secret is redacted without the pin",
    redacted?.thing === "private thing" && redacted.rawText === "" && redacted.location === null,
    JSON.stringify(redacted),
  );
  check("secret text never appears in a locked response", !/fern/.test(locked.text));

  // unlock
  check("unlock rejects a wrong pin", (await call("unlock", { key, body: { pin: "0000" } })).status === 401);
  check("unlock accepts the right pin", (await call("unlock", { key, body: { pin: PIN } })).status === 200);

  // list, unlocked
  const open = await call("items", { key, pin: PIN });
  const revealed = (open.json?.items ?? []).find((i) => i.id === secretId);
  check("secret is revealed with the pin", revealed?.thing === "spare key", JSON.stringify(revealed));
  const wrongPin = await call("items", { key, pin: "0000" });
  check(
    "a wrong pin header does not reveal",
    (wrongPin.json?.items ?? []).find((i) => i.id === secretId)?.thing === "private thing",
  );

  // recall
  const r1 = await call("recall", { key, body: { query: "where are my keys" } });
  check("recall answers a location question", /hall closet/.test(r1.json?.speak ?? ""), r1.text);
  const r2 = await call("recall", { key, body: { query: "what do I have tomorrow" } });
  check("recall lists tomorrow's reminders", /dentist/.test(r2.json?.speak ?? ""), r2.text);

  // remove
  check("removeItem refuses a secret without the pin", (await call("removeItem", { key, body: { id: secretId } })).status === 403);
  check("removeItem deletes a secret with the pin", (await call("removeItem", { key, pin: PIN, body: { id: secretId } })).status === 200);
  check("removeItem 404s on a missing id", (await call("removeItem", { key, body: { id: secretId } })).status === 404);
  const plainId = c1.json?.item?.id;
  check("removeItem deletes a normal item", (await call("removeItem", { key, body: { id: plainId } })).status === 200);
  const left = await call("items", { key, pin: PIN });
  check("list reflects the deletes", left.json?.items?.length === 1, left.text);

  // alexa: link code -> link -> capture -> recall (the emulator skips Amazon's signature check)
  const alexa = async (userId, intent, slots = {}, type = "IntentRequest") => {
    const body = {
      session: { user: { userId } },
      request: { type, intent: { name: intent, slots: Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, { value: v }])) } },
    };
    const res = await fetch(`${BASE}/alexa`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return (await res.json())?.response?.outputSpeech?.text ?? "";
  };
  const avid = `amzn1.ask.account.e2e${Date.now()}`;
  check("alexaLinkCode rejects a missing key", (await call("alexaLinkCode")).status === 401);
  check("alexa asks an unlinked user to link", /Link Alexa/.test(await alexa(avid, "RecallIntent", { query: "keys" })));
  check("alexa rejects a bad link code", /didn't work/.test(await alexa(avid, "LinkIntent", { code: "123456" })));
  const lc = await call("alexaLinkCode", { key });
  check("alexaLinkCode returns a 6-digit code", /^\d{6}$/.test(lc.json?.code ?? ""), lc.text);
  check("alexa links with a good code", /^Linked/.test(await alexa(avid, "LinkIntent", { code: lc.json?.code })));
  check("alexa link code is single use", /didn't work/.test(await alexa("amzn1.ask.account.other", "LinkIntent", { code: lc.json?.code })));
  check("alexa captures", /Got it/.test(await alexa(avid, "CaptureIntent", { text: "I put the passport in the blue folder" })));
  check("alexa recalls", /blue folder/.test(await alexa(avid, "RecallIntent", { query: "where is my passport" })));

  // isolation
  const other = await call("signup", { body: { name: "Other" } });
  const otherItems = await call("items", { key: other.json?.api_key });
  check("another user sees none of it", otherItems.json?.items?.length === 0, otherItems.text);
}

main()
  .catch((e) => {
    console.error("E2E crashed. Is `npm run backend` running?\n", e);
    failures++;
  })
  .finally(() => {
    console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
    process.exit(failures ? 1 : 0);
  });
