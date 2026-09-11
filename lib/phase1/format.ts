/**
 * Dates and times, always in Singapore.
 *
 * Two problems, one fix. A component that renders `toLocaleString()` produces
 * one string on the server — which runs in UTC — and a different one in the
 * reader's browser, and React reports that as a hydration mismatch and stops
 * patching the tree. Separately, a date-only value like `2026-08-28` becomes
 * midnight UTC when parsed, which in any timezone west of here is the day
 * before, so a listing published on the 28th shows as the 27th.
 *
 * Pinning the timezone solves both, and it is the right answer on its own
 * terms: this is a Singapore product, and a date on it means a Singapore date
 * whoever is looking.
 */

const TZ = 'Asia/Singapore';

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-SG', { timeZone: TZ, ...opts });

const DATE = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const DATE_LONG = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const DATE_SHORT = fmt({ day: 'numeric', month: 'short' });
const TIME = fmt({ hour: '2-digit', minute: '2-digit', hour12: false });
const DATETIME = fmt({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const STAMP = fmt({ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const parse = (value: string | Date): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (!value) return null;
  // A bare date is read as Singapore midnight rather than UTC midnight.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+08:00` : value;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const safe = (f: Intl.DateTimeFormat, value: string | Date | undefined, fallback: string) => {
  const d = value === undefined ? null : parse(value);
  return d ? f.format(d) : fallback;
};

/** "28 Aug 2026" */
export const sgDate = (v?: string | Date, fallback = '—') => safe(DATE, v, fallback);
/** "28 August 2026" */
export const sgDateLong = (v?: string | Date, fallback = '—') => safe(DATE_LONG, v, fallback);
/** "28 Aug" */
export const sgDateShort = (v?: string | Date, fallback = '—') => safe(DATE_SHORT, v, fallback);
/** "14:32" */
export const sgTime = (v?: string | Date, fallback = '—') => safe(TIME, v, fallback);
/** "28 Aug, 14:32" */
export const sgDateTime = (v?: string | Date, fallback = '—') => safe(DATETIME, v, fallback);
/** "28/08/2026, 14:32:05" — for a log, where the full stamp is the point. */
export const sgStamp = (v?: string | Date, fallback = '—') => safe(STAMP, v, fallback);

/** "4 minutes ago", "2 days ago". Relative to a time the caller supplies. */
export function sgRelative(value: string | Date, now: Date): string {
  const d = parse(value);
  if (!d) return '—';
  const secs = Math.round((now.getTime() - d.getTime()) / 1000);
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} d ago`;
  return sgDate(d);
}

const DAY_FULL = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const DAY_WEEK = fmt({ weekday: 'long', day: 'numeric', month: 'long' });

/** "Friday, 11 September 2026" */
export const sgDayFull = (v?: string | Date, fallback = '—') => safe(DAY_FULL, v, fallback);
/** "Friday, 11 September" */
export const sgWeekday = (v?: string | Date, fallback = '—') => safe(DAY_WEEK, v, fallback);
