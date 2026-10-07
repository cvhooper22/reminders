// Cloud Functions for the "Junk Drawer" Alexa skill.
//
//   alexaLinkCode -- the app asks for a short-lived 6-digit code (authed with x-app-key).
//   alexa         -- the skill's endpoint. Alexa never sees an api_key; instead the person says
//                    "Alexa, tell junk drawer to link 123456" once, and we remember
//                    alexaUsers/{alexa userId} -> apiKey from then on.
//
// Capture and recall go through the same functions the Siri Shortcut and app use, so
// secret items stay vague out loud here too.

import { randomInt } from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { SkillRequestSignatureVerifier, TimestampVerifier } from "ask-sdk-express-adapter";
import { db } from "./admin";
import { getUserByApiKey, getUserFromRequest, type AuthedUser } from "./shared/auth";
import { saveCapture } from "./capture";
import { answerRecall } from "./recall";

const LINK_CODE_TTL_MS = 10 * 60 * 1000;
const linkCodes = () => db.collection("alexaLinkCodes");
const alexaUsers = () => db.collection("alexaUsers");

// ---- link codes -------------------------------------------------------------------------

export const alexaLinkCode = onRequest({ cors: true }, async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).send("unauthorized");
    return;
  }

  // 100000-999999: no leading zero, because Alexa hands the spoken digits back as a number.
  // create() fails if the code is already live, so a collision just rolls again.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(randomInt(100000, 1000000));
    try {
      await linkCodes().doc(code).create({ apiKey: user.apiKey, expiresAt: Date.now() + LINK_CODE_TTL_MS });
      res.json({ code, expiresInMinutes: LINK_CODE_TTL_MS / 60000 });
      return;
    } catch {
      // try another code
    }
  }
  res.status(500).send("could not make a code");
});

// Single use: the code is deleted whether or not it was still valid.
async function redeemLinkCode(code: string, alexaUserId: string): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const ref = linkCodes().doc(code);
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    tx.delete(ref);
    const { apiKey, expiresAt } = snap.data()!;
    if (typeof expiresAt !== "number" || expiresAt < Date.now()) return false;
    tx.set(alexaUsers().doc(alexaUserId), { apiKey, linkedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

// ---- the skill --------------------------------------------------------------------------

interface AlexaSlot {
  value?: string;
}
interface AlexaEnvelope {
  session?: { user?: { userId?: string }; application?: { applicationId?: string } };
  context?: { System?: { application?: { applicationId?: string } } };
  request: { type: string; intent?: { name: string; slots?: Record<string, AlexaSlot> } };
}

interface Reply {
  speech: string;
  /** Keep the mic open and say this if the person stays quiet. */
  reprompt?: string;
}

const HELP =
  "You can say, remember my keys are in the hall closet. Or, where are my keys. Or, what's on for today.";
const LINK_FIRST =
  "Let's connect this to your account first. Open the Junk Drawer app, tap Link Alexa, then say, " +
  "tell junk drawer to link, followed by the six digit code.";

const slot = (env: AlexaEnvelope, name: string) =>
  env.request.intent?.slots?.[name]?.value?.trim() || "";

async function route(env: AlexaEnvelope, alexaUserId: string): Promise<Reply> {
  const { type, intent } = env.request;
  if (type === "LaunchRequest") return { speech: "Junk drawer. What do you want to remember or find?", reprompt: HELP };
  if (type !== "IntentRequest" || !intent) return { speech: "" };

  switch (intent.name) {
    case "AMAZON.HelpIntent":
      return { speech: HELP, reprompt: HELP };
    case "AMAZON.StopIntent":
    case "AMAZON.CancelIntent":
      return { speech: "Okay." };
    case "AMAZON.FallbackIntent":
      return { speech: "Sorry, I didn't get that. " + HELP, reprompt: HELP };
  }

  if (intent.name === "LinkIntent") {
    const code = slot(env, "code").replace(/\D/g, "");
    if (!(await redeemLinkCode(code, alexaUserId))) {
      return { speech: "That code didn't work. Make a new one in the app and try again." };
    }
    return { speech: "Linked. Try saying, remember my keys are on the hook." };
  }

  const link = await alexaUsers().doc(alexaUserId).get();
  const user: AuthedUser | null = link.exists ? await getUserByApiKey(link.data()!.apiKey) : null;
  if (!user) return { speech: LINK_FIRST };

  if (intent.name === "CaptureIntent") {
    const text = slot(env, "text");
    if (!text) return { speech: "I didn't catch what to remember.", reprompt: HELP };
    const { body } = await saveCapture(user, text);
    return { speech: String(body.speak) };
  }
  if (intent.name === "RecallIntent") {
    const query = slot(env, "query");
    if (!query) return { speech: "I didn't catch what to look for.", reprompt: HELP };
    return { speech: (await answerRecall(user, query)).speak };
  }
  return { speech: "Sorry, I can't do that. " + HELP, reprompt: HELP };
}

// Alexa signs every request; the emulator has no Amazon signature, so tests may skip it.
async function verify(rawBody: string, headers: Record<string, string | string[] | undefined>, env: AlexaEnvelope) {
  if (process.env.FUNCTIONS_EMULATOR === "true" && process.env.ALEXA_SKIP_VERIFY === "true") return;
  await new SkillRequestSignatureVerifier().verify(rawBody, headers);
  await new TimestampVerifier().verify(rawBody);
  // ALEXA_SKILL_ID (firebase/functions/.env.<project>) is set once the skill exists in the
  // Alexa console; requests for any other skill are then rejected.
  const expected = process.env.ALEXA_SKILL_ID;
  const actual = env.session?.application?.applicationId ?? env.context?.System?.application?.applicationId;
  if (expected && actual !== expected) throw new Error("wrong skill");
}

export const alexa = onRequest(async (req, res) => {
  const rawBody = req.rawBody?.toString("utf8") ?? "";
  let env: AlexaEnvelope;
  try {
    env = JSON.parse(rawBody);
    await verify(rawBody, req.headers, env);
  } catch {
    res.status(400).send("bad request");
    return;
  }

  let reply: Reply;
  try {
    const userId = env.session?.user?.userId;
    reply = userId ? await route(env, userId) : { speech: "" };
  } catch {
    reply = { speech: "Sorry, something went wrong." };
  }

  const keepOpen = !!reply.reprompt;
  res.json({
    version: "1.0",
    response: {
      ...(reply.speech && { outputSpeech: { type: "PlainText", text: reply.speech } }),
      ...(reply.reprompt && { reprompt: { outputSpeech: { type: "PlainText", text: reply.reprompt } } }),
      shouldEndSession: !keepOpen,
    },
  });
});
