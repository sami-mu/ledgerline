const long = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "2026-11-05" -> "Nov 5, 2026", read as a calendar date (no time zone shift). */
export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const [, y, m, d] = match;
  return long.format(new Date(Number(y), Number(m) - 1, Number(d)));
}

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return `${long.format(date)} at ${time.format(date)}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [a, b] = [fromIso, toIso].map((iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y!, m! - 1, d!);
  });
  return Math.round((b! - a!) / 86_400_000);
}
