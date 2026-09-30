// Timezone helpers. Cloud Functions run in UTC, so anything involving "today",
// "tomorrow", or "9am" has to be interpreted in the person's own timezone.

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// Minutes the zone is ahead of UTC at the given instant (e.g. -420 for PDT).
export function tzOffsetMinutes(timeZone: string, at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

// Midnight in the given zone, `addDays` days from the local date of `at`, as a real instant.
export function startOfLocalDay(at: Date, timeZone: string, addDays = 0): Date {
  const local = new Date(at.getTime() + tzOffsetMinutes(timeZone, at) * 60000);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() + addDays);
  // Re-check the offset at the target midnight in case a DST change falls in between.
  const guess = new Date(local.getTime() - tzOffsetMinutes(timeZone, at) * 60000);
  return new Date(local.getTime() - tzOffsetMinutes(timeZone, guess) * 60000);
}
