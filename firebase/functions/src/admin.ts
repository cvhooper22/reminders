import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";

// Keep functions in the same region as the Firestore database. Every function file imports
// this module before defining its function, so this applies to all of them.
setGlobalOptions({ region: "us-west3" });

initializeApp();

// The project uses a named database, not "(default)".
export const db = getFirestore("reminders-db");
