import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request } from "firebase-functions/v2/https";
import type { AuthedUser } from "./auth";

// The locked tin's PIN. Stored as a salted scrypt hash on the user document.
// A 4-digit PIN is only 10,000 guesses, so this is a privacy speed-bump, not real
// security: add attempt throttling before exposing this to strangers.

export const isValidPin = (pin: unknown): pin is string =>
  typeof pin === "string" && /^\d{4}$/.test(pin);

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function checkPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** True when the request carries the correct tin PIN in `x-tin-pin`. */
export function hasTinAccess(req: Request, user: AuthedUser): boolean {
  const pin = req.header("x-tin-pin");
  return !!pin && !!user.pinHash && isValidPin(pin) && checkPin(pin, user.pinHash);
}
