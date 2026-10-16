import { getLocalStore } from "@/database/localStore";
import type { LocalTask, Task, TaskInput } from "@/types/task";
import { PRIORITIES, RECURRENCE_TYPES } from "@/types/task";
import { isValidDateString, isValidTimeString, todayString } from "@/utils/datetime";
import { randomId } from "@/utils/hash";
import { rollForward } from "./recurrenceService";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateTaskInput(input: TaskInput): void {
  const title = input.title?.trim() ?? "";
  if (!title) throw new ValidationError("Title is required.");
  if (title.length > 200) throw new ValidationError("Title must be 200 characters or fewer.");
  if (!PRIORITIES.includes(input.priority)) throw new ValidationError("Invalid priority.");
  if (!RECURRENCE_TYPES.includes(input.recurrenceType)) {
    throw new ValidationError("Invalid repeat option.");
  }
  if (input.dueDate && !isValidDateString(input.dueDate)) {
    throw new ValidationError("Date is invalid.");
  }
  if (input.dueTime && !isValidTimeString(input.dueTime)) {
    throw new ValidationError("Time is invalid.");
  }
  if (input.reminderEnabled) {
    if (!isValidDateString(input.dueDate)) {
      throw new ValidationError("A valid date is required when the reminder is on.");
    }
    if (!isValidTimeString(input.dueTime)) {
      throw new ValidationError("A valid time is required when the reminder is on.");
    }
  }
  if (input.recurrenceType !== "NEVER" && !isValidDateString(input.dueDate)) {
    throw new ValidationError("Repeating tasks need a start date.");
  }
}

function sanitize(input: TaskInput) {
  return {
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    dueDate: input.dueDate || null,
    dueTime: input.dueTime || null,
    priority: input.priority,
    reminderEnabled: input.reminderEnabled,
    recurrenceType: input.recurrenceType,
    recurrenceRule: input.recurrenceRule ?? null,
  };
}

export async function listTasks(): Promise<LocalTask[]> {
  const rows = await getLocalStore().allTasks();
  return rows.filter((task) => !task.deletedAt);
}

export async function listAllRows(): Promise<LocalTask[]> {
  return getLocalStore().allTasks();
}

export async function createTask(input: TaskInput): Promise<LocalTask> {
  validateTaskInput(input);
  const now = Date.now();
  const task: LocalTask = {
    id: randomId(),
    ...sanitize(input),
    status: "PENDING",
    occurrence: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    deletedAt: null,
    dirty: true,
  };
  await getLocalStore().putTask(task);
  return task;
}

export async function updateTask(id: string, input: TaskInput): Promise<LocalTask> {
  validateTaskInput(input);
  const store = getLocalStore();
  const existing = await store.getTask(id);
  if (!existing) throw new ValidationError("Task no longer exists.");

  const updated: LocalTask = {
    ...existing,
    ...sanitize(input),
    updatedAt: Date.now(),
    dirty: true,
  };
  await store.putTask(updated);
  return updated;
}

export async function completeTask(id: string): Promise<{ completed: LocalTask; next: LocalTask | null }> {
  const store = getLocalStore();
  const existing = await store.getTask(id);
  if (!existing) throw new ValidationError("Task no longer exists.");

  const now = Date.now();

  // Recurring tasks roll their single row forward to the next occurrence and
  // leave an immutable completed copy behind for history.
  if (existing.recurrenceType !== "NEVER" && existing.dueDate) {
    const rolled = rollForward(existing, todayString(new Date(now)));
    const historyRow: LocalTask = {
      ...existing,
      id: randomId(),
      status: "COMPLETED",
      completedAt: now,
      recurrenceType: "NEVER",
      recurrenceRule: null,
      reminderEnabled: false,
      createdAt: now,
      updatedAt: now,
      dirty: true,
    };
    if (rolled) {
      const nextRow: LocalTask = { ...(rolled as LocalTask), dirty: true };
      await store.putTasks([historyRow, nextRow]);
      return { completed: historyRow, next: nextRow };
    }
  }

  const completed: LocalTask = {
    ...existing,
    status: "COMPLETED",
    completedAt: now,
    updatedAt: now,
    dirty: true,
  };
  await store.putTask(completed);
  return { completed, next: null };
}

export async function reopenTask(id: string): Promise<LocalTask> {
  const store = getLocalStore();
  const existing = await store.getTask(id);
  if (!existing) throw new ValidationError("Task no longer exists.");
  const reopened: LocalTask = {
    ...existing,
    status: "PENDING",
    completedAt: null,
    updatedAt: Date.now(),
    dirty: true,
  };
  await store.putTask(reopened);
  return reopened;
}

/** Soft delete (tombstone) so the deletion propagates to other devices. */
export async function deleteTask(id: string): Promise<LocalTask | null> {
  const store = getLocalStore();
  const existing = await store.getTask(id);
  if (!existing) return null;
  const now = Date.now();
  const deleted: LocalTask = {
    ...existing,
    deletedAt: now,
    updatedAt: now,
    dirty: true,
  };
  await store.putTask(deleted);
  return deleted;
}

export function toTaskInput(task: Task): TaskInput {
  return {
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    priority: task.priority,
    reminderEnabled: task.reminderEnabled,
    recurrenceType: task.recurrenceType,
    recurrenceRule: task.recurrenceRule,
  };
}
