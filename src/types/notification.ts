import type { Priority } from "./task";

export type NotificationChannelId =
  | "reminders-high"
  | "reminders-medium"
  | "reminders-low"
  | "missed-summary";

export interface ScheduledNotification {
  /** Deterministic id derived from taskId + occurrence. */
  id: number;
  taskId: string;
  occurrence: number;
  title: string;
  body: string;
  /** Epoch ms of the scheduled fire time. */
  at: number;
  channelId: NotificationChannelId;
  priority: Priority;
}

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";
