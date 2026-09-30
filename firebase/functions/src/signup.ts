// Cloud Function: signup
//
// Called once per new person (e.g. from the setup web page) to create their
// account and hand back the api_key they'll paste into their own Shortcut.
// Pass "timezone" (IANA name, e.g. "America/Los_Angeles") so reminders use their
// local day; the setup page can get it from Intl.DateTimeFormat().resolvedOptions().
// No auth required to call this -- fine for personal/family scale. If you
// ever open this up publicly, add an invite code or similar gate here.

import { randomBytes } from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./admin";
import { isValidTimeZone } from "./shared/tz";

export const signup = onRequest(async (req, res) => {
  const { name, timezone } = req.body ?? {};

  if (timezone !== undefined && (typeof timezone !== "string" || !isValidTimeZone(timezone))) {
    res.status(400).json({ error: "unknown timezone" });
    return;
  }

  // The api_key doubles as the users/{apiKey} document id -- see shared/auth.ts.
  const apiKey = randomBytes(24).toString("hex");

  await db
    .collection("users")
    .doc(apiKey)
    .set({
      name: name || null,
      timezone: timezone || "UTC",
      createdAt: FieldValue.serverTimestamp(),
    });

  res.json({ api_key: apiKey });
});
