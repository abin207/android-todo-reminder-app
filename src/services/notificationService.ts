import type {
  NotificationChannelId,
  PermissionState,
  ScheduledNotification,
} from "@/types/notification";
import type { Priority, Task } from "@/types/task";
import type { AppSettings } from "./settingsService";
import { buildMissedSummaryBody, findMissedTasks } from "./missedTaskService";
import { getNotificationAdapter } from "./notificationAdapter";
import { isValidDateString, isValidTimeString, toEpoch, todayString } from "@/utils/datetime";
import { stableHash } from "@/utils/hash";

/** Only look this far ahead; Android caps the number of pending alarms. */
const SCHEDULE_HORIZON_DAYS = 60;

const CHANNEL_BY_PRIORITY: Record<Priority, NotificationChannelId> = {
  HIGH: "reminders-high",
  MEDIUM: "reminders-medium",
  LOW: "reminders-low",
};

const TITLE_BY_PRIORITY: Record<Priority, string> = {
  HIGH: "🔴 HIGH PRIORITY",
  MEDIUM: "🟡 Task Reminder",
  LOW: "🔔 Task Reminder",
};

/** Deterministic notification id: hash(taskId + occurrence). */
export function notificationIdFor(taskId: string, occurrence: number): number {
  return stableHash(`task:${taskId}:${occurrence}`);
}

export function missedSummaryIdFor(dateString: string): number {
  return stableHash(`missed-summary:${dateString}`);
}

export function buildTaskNotification(task: Task): ScheduledNotification | null {
  if (!task.reminderEnabled || task.status !== "PENDING" || task.deletedAt) return null;
  if (!isValidDateString(task.dueDate) || !isValidTimeString(task.dueTime)) return null;

  return {
    id: notificationIdFor(task.id, task.occurrence),
    taskId: task.id,
    occurrence: task.occurrence,
    title: TITLE_BY_PRIORITY[task.priority],
    body: `${task.title} is due now.`,
    at: toEpoch(task.dueDate as string, task.dueTime),
    channelId: CHANNEL_BY_PRIORITY[task.priority],
    priority: task.priority,
  };
}

/**
 * Computes the full set of notifications that *should* exist on this device
 * right now, given the current tasks and settings.
 */
export function desiredNotifications(
  tasks: Task[],
  settings: AppSettings,
  now: Date = new Date(),
): ScheduledNotification[] {
  const result: ScheduledNotification[] = [];
  const nowMs = now.getTime();
  const horizon = nowMs + SCHEDULE_HORIZON_DAYS * 24 * 60 * 60 * 1000;

  if (settings.taskRemindersEnabled) {
    for (const task of tasks) {
      const notification = buildTaskNotification(task);
      if (!notification) continue;
      if (notification.at <= nowMs || notification.at > horizon) continue;
      result.push(notification);
    }
  }

  if (settings.missedSummaryEnabled) {
    const summary = buildMissedSummaryNotification(tasks, settings, now);
    if (summary) result.push(summary);
  }

  return result;
}

/**
 * Builds the end-of-day summary. It is predictive: at summary time, every
 * task due earlier today that is still pending counts as missed. If nothing
 * would be missed, no notification is produced (and reconciliation cancels a
 * previously scheduled one).
 */
export function buildMissedSummaryNotification(
  tasks: Task[],
  settings: AppSettings,
  now: Date = new Date(),
): ScheduledNotification | null {
  const today = todayString(now);
  if (!isValidTimeString(settings.missedSummaryTime)) return null;
  const summaryAt = toEpoch(today, settings.missedSummaryTime);
  if (summaryAt <= now.getTime()) return null;

  const missed = findMissedTasks(tasks, new Date(summaryAt));
  if (!missed.length) return null;

  return {
    id: missedSummaryIdFor(today),
    taskId: "missed-summary",
    occurrence: 0,
    title: "⚠️ Missed Tasks",
    body: buildMissedSummaryBody(missed),
    at: summaryAt,
    channelId: "missed-summary",
    priority: "MEDIUM",
  };
}

export interface ReconcileResult {
  scheduled: number;
  cancelled: number;
  permission: PermissionState;
}

/**
 * Reconciliation: compares what the OS currently holds with what should be
 * scheduled, cancelling obsolete notifications and (re)scheduling the rest.
 * Runs on app start, after every task mutation and after every sync.
 */
export async function reconcileNotifications(
  tasks: Task[],
  settings: AppSettings,
  now: Date = new Date(),
): Promise<ReconcileResult> {
  const adapter = await getNotificationAdapter();
  const permission = await adapter.getPermission();
  const desired = desiredNotifications(tasks, settings, now);

  if (permission !== "granted") {
    return { scheduled: 0, cancelled: 0, permission };
  }

  let pending: number[] = [];
  try {
    pending = await adapter.listPending();
  } catch (error) {
    console.warn("[notifications] unable to list pending", error);
  }

  const desiredIds = new Set(desired.map((item) => item.id));
  const obsolete = pending.filter((id) => !desiredIds.has(id));

  if (obsolete.length) await adapter.cancel(obsolete);
  if (desired.length) await adapter.schedule(desired);

  return { scheduled: desired.length, cancelled: obsolete.length, permission };
}

export async function cancelTaskNotification(task: Task): Promise<void> {
  const adapter = await getNotificationAdapter();
  const ids = [];
  for (let i = 0; i <= task.occurrence; i += 1) {
    ids.push(notificationIdFor(task.id, i));
  }
  await adapter.cancel(ids);
}

export async function initNotifications(): Promise<PermissionState> {
  const adapter = await getNotificationAdapter();
  await adapter.createChannels();
  return adapter.getPermission();
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  const adapter = await getNotificationAdapter();
  const state = await adapter.ensurePermission();
  if (state === "granted") await adapter.createChannels();
  return state;
}
