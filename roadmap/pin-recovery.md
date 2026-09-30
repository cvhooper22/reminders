# PIN recovery and reset

Status: future work (not started)

## Problem

The tin PIN is global per user, exactly 4 digits, and stored as a one-way scrypt hash on
the user document (`firebase/functions/src/shared/pin.ts`, `signup.ts`). The server can
only check a guess, so a forgotten PIN can't be recovered. There is also no endpoint to
change or reset it after signup. `unlock` has no attempt throttling either.

## Constraint

Recovery has to prove identity out-of-band. Auth today is just an API key that lives on
the phone, and the PIN exists to stop someone who has the phone. If the app itself could
reveal the PIN, it would protect nothing.

## Proposed design

1. **Store the PIN encrypted, not hashed.** AES-GCM with a key held as a Firebase secret
   (same mechanism as `ANTHROPIC_API_KEY`). Makes recovery possible. A 4-digit hash is
   brute-forceable in seconds anyway, so little real security is lost.
2. **Recover by email.** Signup takes an optional email. A `recoverPin` endpoint sends the
   PIN to that address. New dependency: an email sender (Resend by default, unless
   another is preferred).
3. **Reset as well as recover.**
   - `changePin`: requires the current PIN.
   - `resetPin`: requires an emailed one-time code, sets a new PIN without revealing the old one.
4. **Optional PIN hint.** Cheap, but weak: anyone holding the phone can read it.

Rejected: a recovery code shown once at signup. It's a reset, not a recovery, and it gets
lost the same way the PIN does.

## Related

- Add attempt throttling to `unlock` (and anything else that checks the PIN).
- Existing users have `pinHash` only; migrating to encrypted storage means they must
  re-enter their PIN once (a hash can't be converted).

## Open questions

- Email as the recovery channel: confirmed preference, but no sender chosen yet.
