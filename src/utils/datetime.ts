/**
 * Wall-clock date/time helpers.
 *
 * Tasks store `dueDate` (YYYY-MM-DD) and `dueTime` (HH:mm, 24h) in the user's
 * local calendar. Converting to an absolute instant is always done lazily with
 * the *device's current* timezone rules, which keeps reminders at the intended
 * local time across DST shifts and device timezone changes.
 */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDateString(value: string | null | undefined): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  );
}

export function isValidTimeString(value: string | null | undefined): value is string {
  return !!value && TIME_RE.test(value);
}

/** Converts wall-clock date/time to an absolute epoch ms in the local zone. */
export function toEpoch(dueDate: string, dueTime: string | null): number {
  const [y, m, d] = dueDate.split("-").map(Number);
  const [hh, mm] = (dueTime ?? "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toTimeString(date: Date): string {
  return `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

export function parseDateString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayString(now: Date = new Date()): string {
  return toDateString(now);
}

export function addDays(value: string, days: number): string {
  const date = parseDateString(value);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/**
 * Adds months while clamping to the last valid day of the target month, so
 * Jan 31 + 1 month => Feb 28 (or Feb 29 on leap years), never Mar 3.
 */
export function addMonthsClamped(value: string, months: number): string {
  const [y, m, d] = value.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return toDateString(target);
}

export function formatTime12h(time: string | null): string {
  if (!time) return "No time";
  const [hh, mm] = time.split(":").map(Number);
  const suffix = hh >= 12 ? "PM" : "AM";
  const hour = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour}:${`${mm}`.padStart(2, "0")} ${suffix}`;
}

export function formatLongDate(dateString: string): string {
  return parseDateString(dateString).toLocaleDateString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "Friday, 2 October" */
export function formatGreetingDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "Fri, 3 Oct 2026" */
export function formatShortDate(dateString: string): string {
  return parseDateString(dateString).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function greetingFor(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function relativeDayLabel(dateString: string, now: Date = new Date()): string {
  const today = toDateString(now);
  if (dateString === today) return "Today";
  if (dateString === addDays(today, 1)) return "Tomorrow";
  if (dateString === addDays(today, -1)) return "Yesterday";
  return formatLongDate(dateString);
}
