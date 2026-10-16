import type { TaskRow } from "@/db/schema";
import type { Priority, RecurrenceType, Status, Task } from "@/types/task";
import { PRIORITIES, RECURRENCE_TYPES, STATUSES } from "@/types/task";
import { parseRule, serializeRule } from "@/services/recurrenceService";
import { isValidDateString, isValidTimeString } from "@/utils/datetime";

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate,
    dueTime: row.dueTime,
    priority: (PRIORITIES as readonly string[]).includes(row.priority)
      ? (row.priority as Priority)
      : "MEDIUM",
    status: (STATUSES as readonly string[]).includes(row.status)
      ? (row.status as Status)
      : "PENDING",
    reminderEnabled: row.reminderEnabled,
    recurrenceType: (RECURRENCE_TYPES as readonly string[]).includes(row.recurrenceType)
      ? (row.recurrenceType as RecurrenceType)
      : "NEVER",
    recurrenceRule: parseRule(row.recurrenceRule),
    occurrence: row.occurrence,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    completedAt: row.completedAt ? row.completedAt.getTime() : null,
    deletedAt: row.deletedAt ? row.deletedAt.getTime() : null,
  };
}

/** Server-side validation of an incoming task; never trust the client. */
export function parseIncomingTask(value: unknown): Task | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const id = typeof raw.id === "string" ? raw.id : null;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!id || !title || title.length > 200) return null;

  const priority = (PRIORITIES as readonly string[]).includes(String(raw.priority))
    ? (raw.priority as Priority)
    : "MEDIUM";
  const status = (STATUSES as readonly string[]).includes(String(raw.status))
    ? (raw.status as Status)
    : "PENDING";
  const recurrenceType = (RECURRENCE_TYPES as readonly string[]).includes(
    String(raw.recurrenceType),
  )
    ? (raw.recurrenceType as RecurrenceType)
    : "NEVER";

  const dueDate = isValidDateString(raw.dueDate as string) ? (raw.dueDate as string) : null;
  const dueTime = isValidTimeString(raw.dueTime as string) ? (raw.dueTime as string) : null;
  const numberOr = (input: unknown, fallback: number): number =>
    typeof input === "number" && Number.isFinite(input) ? input : fallback;

  return {
    id,
    title,
    description: typeof raw.description === "string" ? raw.description.slice(0, 2000) : null,
    dueDate,
    dueTime,
    priority,
    status,
    reminderEnabled: Boolean(raw.reminderEnabled),
    recurrenceType,
    recurrenceRule:
      raw.recurrenceRule && typeof raw.recurrenceRule === "object"
        ? parseRule(serializeRule(raw.recurrenceRule as never))
        : null,
    occurrence: Math.max(0, Math.floor(numberOr(raw.occurrence, 0))),
    createdAt: numberOr(raw.createdAt, Date.now()),
    updatedAt: numberOr(raw.updatedAt, Date.now()),
    completedAt: typeof raw.completedAt === "number" ? raw.completedAt : null,
    deletedAt: typeof raw.deletedAt === "number" ? raw.deletedAt : null,
  };
}
