// Seeds the LOCAL Firestore emulator with a dev user and the same sample items the
// app's mock data uses, so the UI has something to show.
//
//   npm run seed        (from the repo root, with `npm run backend` running)
//
// Writes straight to the emulator via the Admin SDK so items can be backdated.
// Dev user: api key "dev-local-key", tin PIN 1234, timezone America/Los_Angeles.

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.GCLOUD_PROJECT ||= "demo-reminders";

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { hashPin } = require("../lib/shared/pin");

initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore("reminders-db");

const API_KEY = "dev-local-key";
const now = Date.now();
const hoursAgo = (h) => Timestamp.fromMillis(now - h * 3600000);
const inFuture = (days, hour) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return Timestamp.fromDate(d);
};
const nextSunday = (7 - new Date(now).getDay()) % 7 || 7;

const item = (thing, rawText, location, ageHours, extra = {}) => ({
  thing,
  rawText,
  location,
  remindAt: null,
  isSecret: false,
  extractedBy: "free",
  createdAt: hoursAgo(ageHours),
  ...extra,
});

const ITEMS = [
  item("keys", "keys in the bowl by the front door", "in the bowl by the front door", 2),
  item("parking spot", "parking spot is level 3, row G", "level 3, row G", 3),
  item("call the dentist", "call the dentist tomorrow 9am", null, 14, { remindAt: inFuture(1, 9) }),
  item("water the fern", "water the fern Sunday 10am", null, 50, { remindAt: inFuture(nextSunday, 10) }),
  item("passport", "passport in the blue suitcase, front zip", "in the blue suitcase, front zip", 72),
  item("wifi password", "private: wifi password is taped inside the router cabinet", "inside the router cabinet", 96, { isSecret: true }),
  item("gift for mom", "secret: mom's birthday gift is behind the garage shelf", "behind the garage shelf", 120, { isSecret: true }),
  item("scissors", "scissors in the kitchen junk drawer", "in the kitchen junk drawer", 144),
  item("umbrella", "umbrella in the car trunk", "in the car trunk", 200),
  item("batteries", "batteries in the hall closet", "in the hall closet", 230),
  item("spare key", "private spare key under the fern pot", "under the fern pot", 312, { isSecret: true }),
];

async function main() {
  const userRef = db.collection("users").doc(API_KEY);
  const itemsRef = userRef.collection("items");

  // Reset so the script is safe to re-run.
  const old = await itemsRef.get();
  await Promise.all(old.docs.map((d) => d.ref.delete()));

  await userRef.set({
    name: "Dev",
    timezone: "America/Los_Angeles",
    pinHash: hashPin("1234"),
    createdAt: Timestamp.now(),
  });
  await Promise.all(ITEMS.map((i) => itemsRef.add(i)));
  console.log(`Seeded user "${API_KEY}" (PIN 1234) with ${ITEMS.length} items.`);
}

main().catch((e) => {
  console.error("Seed failed. Is `npm run backend` running?\n", e.message);
  process.exit(1);
});
