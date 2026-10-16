import type {
  NotificationChannelId,
  PermissionState,
  ScheduledNotification,
} from "@/types/notification";
import { isNativePlatform } from "@/utils/platform";

/**
 * Platform port for notifications. Android uses Capacitor Local Notifications
 * (inexact scheduling only — we never request SCHEDULE_EXACT_ALARM). The web
 * adapter uses the Notification API plus in-page timers, which is enough for
 * development and the desktop/PWA experience.
 */
export interface NotificationAdapter {
  ensurePermission(): Promise<PermissionState>;
  getPermission(): Promise<PermissionState>;
  createChannels(): Promise<void>;
  listPending(): Promise<number[]>;
  schedule(notifications: ScheduledNotification[]): Promise<void>;
  cancel(ids: number[]): Promise<void>;
}

interface CapacitorLocalNotifications {
  requestPermissions(): Promise<{ display: string }>;
  checkPermissions(): Promise<{ display: string }>;
  createChannel(options: Record<string, unknown>): Promise<void>;
  getPending(): Promise<{ notifications: Array<{ id: number }> }>;
  schedule(options: { notifications: unknown[] }): Promise<unknown>;
  cancel(options: { notifications: Array<{ id: number }> }): Promise<void>;
}

const CHANNELS: Array<{
  id: NotificationChannelId;
  name: string;
  description: string;
  importance: number;
}> = [
  {
    id: "reminders-high",
    name: "High priority reminders",
    description: "Reminders for high priority tasks",
    importance: 5,
  },
  {
    id: "reminders-medium",
    name: "Task reminders",
    description: "Reminders for medium priority tasks",
    importance: 4,
  },
  {
    id: "reminders-low",
    name: "Low priority reminders",
    description: "Reminders for low priority tasks",
    importance: 3,
  },
  {
    id: "missed-summary",
    name: "Missed task summary",
    description: "End of day summary of missed tasks",
    importance: 4,
  },
];

class CapacitorNotificationAdapter implements NotificationAdapter {
  constructor(private readonly plugin: CapacitorLocalNotifications) {}

  private map(state: string): PermissionState {
    if (state === "granted") return "granted";
    if (state === "denied") return "denied";
    return "prompt";
  }

  async ensurePermission(): Promise<PermissionState> {
    const current = await this.plugin.checkPermissions();
    if (current.display === "granted") return "granted";
    const result = await this.plugin.requestPermissions();
    return this.map(result.display);
  }

  async getPermission(): Promise<PermissionState> {
    return this.map((await this.plugin.checkPermissions()).display);
  }

  async createChannels(): Promise<void> {
    for (const channel of CHANNELS) {
      await this.plugin.createChannel({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        visibility: 1,
        vibration: channel.importance >= 4,
      });
    }
  }

  async listPending(): Promise<number[]> {
    const pending = await this.plugin.getPending();
    return pending.notifications.map((item) => item.id);
  }

  async schedule(notifications: ScheduledNotification[]): Promise<void> {
    if (!notifications.length) return;
    await this.plugin.schedule({
      notifications: notifications.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        channelId: item.channelId,
        // `allowWhileIdle: false` keeps us on inexact alarms (no special
        // "Alarms & reminders" permission required).
        schedule: { at: new Date(item.at), allowWhileIdle: false },
        extra: { taskId: item.taskId, occurrence: item.occurrence },
      })),
    });
  }

  async cancel(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await this.plugin.cancel({ notifications: ids.map((id) => ({ id })) });
  }
}

/**
 * Browser adapter: keeps a registry of timers for notifications that fire
 * while the tab is alive. Pending ids are persisted in localStorage so
 * reconciliation behaves identically to the native adapter.
 */
class WebNotificationAdapter implements NotificationAdapter {
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  private storageKey = "web-pending-notifications";

  private read(): Record<string, ScheduledNotification> {
    if (typeof localStorage === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) ?? "{}") as Record<
        string,
        ScheduledNotification
      >;
    } catch {
      return {};
    }
  }

  private write(data: Record<string, ScheduledNotification>): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  async ensurePermission(): Promise<PermissionState> {
    if (typeof Notification === "undefined") return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    const result = await Notification.requestPermission();
    return result === "granted" ? "granted" : result === "denied" ? "denied" : "prompt";
  }

  async getPermission(): Promise<PermissionState> {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission === "granted"
      ? "granted"
      : Notification.permission === "denied"
        ? "denied"
        : "prompt";
  }

  async createChannels(): Promise<void> {
    /* Channels are an Android concept. */
  }

  async listPending(): Promise<number[]> {
    const now = Date.now();
    const data = this.read();
    return Object.values(data)
      .filter((item) => item.at > now)
      .map((item) => item.id);
  }

  async schedule(notifications: ScheduledNotification[]): Promise<void> {
    const data = this.read();
    for (const item of notifications) {
      data[item.id] = item;
      const delay = item.at - Date.now();
      if (delay <= 0 || delay > 24 * 60 * 60 * 1000) continue;
      const existing = this.timers.get(item.id);
      if (existing) clearTimeout(existing);
      this.timers.set(
        item.id,
        setTimeout(() => {
          this.timers.delete(item.id);
          try {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(item.title, { body: item.body, tag: String(item.id) });
            }
          } catch (error) {
            console.warn("[notifications] web display failed", error);
          }
        }, delay),
      );
    }
    this.write(data);
  }

  async cancel(ids: number[]): Promise<void> {
    const data = this.read();
    for (const id of ids) {
      const timer = this.timers.get(id);
      if (timer) clearTimeout(timer);
      this.timers.delete(id);
      delete data[id];
    }
    this.write(data);
  }
}

let adapter: NotificationAdapter | null = null;

export async function getNotificationAdapter(): Promise<NotificationAdapter> {
  if (adapter) return adapter;
  if (isNativePlatform()) {
    try {
      const specifier = ["@capacitor", "local-notifications"].join("/");
      const dynamicImport = new Function("s", "return import(s)") as (
        s: string,
      ) => Promise<{ LocalNotifications?: CapacitorLocalNotifications }>;
      const mod = await dynamicImport(specifier);
      if (mod.LocalNotifications) {
        adapter = new CapacitorNotificationAdapter(mod.LocalNotifications);
        return adapter;
      }
    } catch (error) {
      console.warn("[notifications] native plugin unavailable", error);
    }
  }
  adapter = new WebNotificationAdapter();
  return adapter;
}

export function setNotificationAdapter(custom: NotificationAdapter): void {
  adapter = custom;
}
