import type { Request } from "firebase-functions/v2/https";
import { db } from "../admin";

export interface AuthedUser {
  apiKey: string;
  timezone: string;
}

// The api_key IS the users/{apiKey} document id, so this is a single doc get --
// no query, no index, unlike Postgres's `where api_key = ...` lookup.
export async function getUserFromRequest(req: Request): Promise<AuthedUser | null> {
  const apiKey = req.header("x-app-key");
  if (!apiKey) return null;

  const snap = await db.collection("users").doc(apiKey).get();
  if (!snap.exists) return null;

  const data = snap.data()!;
  return { apiKey, timezone: (data.timezone as string) || "UTC" };
}
