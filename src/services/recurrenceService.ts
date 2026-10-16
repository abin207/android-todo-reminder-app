import type { RecurrenceRule, RecurrenceType, Task } from "@/types/task";
import {
  addDays,
  addMonthsClamped,
  isValidDateString,
  parseDateString,
} from "@/utils/datetime";

/**
 * Recurrence is computed lazily: we never materialise future task rows.
 * A recurring task keeps a single row whose `dueDate` rolls forward to the
 * next occurrence when the current one is completed. `occurrence` increments
 * so each occurrence gets its own deterministic notification id.
 */

export function parseRule(raw: string | null): RecurrenceRule | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RecurrenceRule;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeRule(rule: RecurrenceRule | null | undefined): string | null {
  if (!rule) return null;
  const clean: RecurrenceRule = {};
  if (rule.weekdays?.length) {
    clean.weekdays = [...new Set(rule.weekdays)].filter((d) => d >= 0 && d <= 6).sort();
  }
  if (rule.intervalDays && rule.intervalDays > 0) {
    clean.intervalDays = Math.floor(rule.intervalDays);
  }
  return Object.keys(clean).length ? JSON.stringify(clean) : null;
}

function nextWeekdayDate(from: string, weekdays: number[]): string {
  const allowed = [...new Set(weekdays)].sort();
  if (!allowed.length) return addDays(from, 7);
  for (let step = 1; step <= 14; step += 1) {
    const candidate = addDays(from, step);
    if (allowed.includes(parseDateString(candidate).getDay())) return candidate;
  }
  return addDays(from, 7);
}

/**
 * Returns the next occurrence date (YYYY-MM-DD) strictly after `fromDate`,
 * or null for non-recurring tasks / invalid input.
 */
export function nextOccurrenceDate(
  fromDate: string,
  recurrenceType: RecurrenceType,
  rule: RecurrenceRule | null,
): string | null {
  if (!isValidDateString(fromDate) || recurrenceType === "NEVER") return null;

  switch (recurrenceType) {
    case "DAILY":
      return addDays(fromDate, 1);
    case "WEEKDAYS":
      return nextWeekdayDate(fromDate, [1, 2, 3, 4, 5]);
    case "WEEKLY": {
      const weekdays = rule?.weekdays?.length ? rule.weekdays : null;
      return weekdays ? nextWeekdayDate(fromDate, weekdays) : addDays(fromDate, 7);
    }
    case "MONTHLY":
      return addMonthsClamped(fromDate, 1);
    case "CUSTOM": {
      if (rule?.weekdays?.length) return nextWeekdayDate(fromDate, rule.weekdays);
      if (rule?.intervalDays && rule.intervalDays > 0) {
        return addDays(fromDate, rule.intervalDays);
      }
      return addDays(fromDate, 1);
    }
    default:
      return null;
  }
}

/**
 * Advances a recurring task to the occurrence that follows `fromDate`,
 * catching up to the first occurrence that is not in the past so a task left
 * untouched for weeks does not resurface dozens of stale occurrences.
 */
export function rollForward(task: Task, today: string): Task | null {
  if (task.recurrenceType === "NEVER" || !task.dueDate) return null;

  let date: string | null = task.dueDate;
  let guard = 0;
  do {
    date = nextOccurrenceDate(date as string, task.recurrenceType, task.recurrenceRule);
    guard += 1;
  } while (date && date < today && guard < 400);

  if (!date) return null;

  return {
    ...task,
    dueDate: date,
    status: "PENDING",
    completedAt: null,
    occurrence: task.occurrence + 1,
    updatedAt: Date.now(),
  };
}

export function describeRecurrence(
  recurrenceType: RecurrenceType,
  rule: RecurrenceRule | null,
): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  switch (recurrenceType) {
    case "NEVER":
      return "";
    case "DAILY":
      return "Every day";
    case "WEEKDAYS":
      return "Every weekday";
    case "WEEKLY":
      return rule?.weekdays?.length
        ? `Every ${rule.weekdays.map((d) => names[d]).join(", ")}`
        : "Every week";
    case "MONTHLY":
      return "Every month";
    case "CUSTOM":
      if (rule?.weekdays?.length) {
        return `Every ${rule.weekdays.map((d) => names[d]).join(", ")}`;
      }
      if (rule?.intervalDays) return `Every ${rule.intervalDays} days`;
      return "Custom";
    default:
      return "";
  }
}
