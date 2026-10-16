import { beforeEach, describe, expect, it } from "vitest";
import type { NotificationAdapter } from "@/services/notificationAdapter";
import { setNotificationAdapter } from "@/services/notificationAdapter";
import {
  buildTaskNotification,
  desiredNotifications,
  notificationIdFor,
  reconcileNotifications,
} from "@/services/notificationService";
import { DEFAULT_SETTINGS } from "@/services/settingsService";
import type { ScheduledNotification } from "@/types/notification";
import type { Task } from "@/types/task";

function task(partial: Partial<Task> & { id: string; title: string }): Task {
  return {
    description: null,
    dueDate: "2026-10-03",
    dueTime: "18:00",
    priority: "HIGH",
    status: "PENDING",
    reminderEnabled: true,
    recurrenceType: "NEVER",
    recurrenceRule: null,
    occurrence: 0,
    createdAt: 0,
    updatedAt: 0,
    completedAt: null,
    deletedAt: null,
    ...partial,
  };
}

class FakeAdapter implements NotificationAdapter {
  pending = new Map<number, ScheduledNotification>();
  cancelled: number[] = [];

  async ensurePermission() {
    return "granted" as const;
  }
  async getPermission() {
    return "granted" as const;
  }
  async createChannels() {}
  async listPending() {
    return [...this.pending.keys()];
  }
  async schedule(items: ScheduledNotification[]) {
    items.forEach((item) => this.pending.set(item.id, item));
  }
  async cancel(ids: number[]) {
    ids.forEach((id) => {
      this.cancelled.push(id);
      this.pending.delete(id);
    });
  }
}

let adapter: FakeAdapter;
const now = new Date(2026, 9, 3, 12, 0, 0);
const settings = { ...DEFAULT_SETTINGS, missedSummaryEnabled: false };

beforeEach(() => {
  adapter = new FakeAdapter();
  setNotificationAdapter(adapter);
});

describe("notification ids", () => {
  it("is deterministic per task + occurrence", () => {
    expect(notificationIdFor("abc", 0)).toBe(notificationIdFor("abc", 0));
    expect(notificationIdFor("abc", 0)).not.toBe(notificationIdFor("abc", 1));
    expect(notificationIdFor("abc", 0)).toBeGreaterThan(0);
    expect(notificationIdFor("abc", 0)).toBeLessThan(2147483647);
  });
});

describe("buildTaskNotification", () => {
  it("uses priority specific titles and channels", () => {
    expect(buildTaskNotification(task({ id: "1", title: "Exercise" }))).toMatchObject({
      title: "🔴 HIGH PRIORITY",
      body: "Exercise is due now.",
      channelId: "reminders-high",
    });
    expect(
      buildTaskNotification(task({ id: "2", title: "Study", priority: "MEDIUM" })),
    ).toMatchObject({ title: "🟡 Task Reminder", channelId: "reminders-medium" });
    expect(
      buildTaskNotification(task({ id: "3", title: "Read", priority: "LOW" })),
    ).toMatchObject({ title: "🔔 Task Reminder", channelId: "reminders-low" });
  });

  it("returns null for completed, reminder-off or dateless tasks", () => {
    expect(buildTaskNotification(task({ id: "1", title: "x", status: "COMPLETED" }))).toBeNull();
    expect(buildTaskNotification(task({ id: "2", title: "x", reminderEnabled: false }))).toBeNull();
    expect(buildTaskNotification(task({ id: "3", title: "x", dueTime: null }))).toBeNull();
  });
});

describe("reconcileNotifications", () => {
  it("schedules notifications for pending future tasks", async () => {
    const tasks = [
      task({ id: "a", title: "Exercise" }),
      task({ id: "b", title: "Study", dueTime: "19:30", priority: "MEDIUM" }),
    ];
    const result = await reconcileNotifications(tasks, settings, now);
    expect(result.scheduled).toBe(2);
    expect(adapter.pending.size).toBe(2);
  });

  it("cancels obsolete notifications when a task is completed", async () => {
    const pendingTask = task({ id: "a", title: "Exercise" });
    await reconcileNotifications([pendingTask], settings, now);
    const id = notificationIdFor("a", 0);
    expect(adapter.pending.has(id)).toBe(true);

    await reconcileNotifications(
      [{ ...pendingTask, status: "COMPLETED", completedAt: Date.now() }],
      settings,
      now,
    );
    expect(adapter.cancelled).toContain(id);
    expect(adapter.pending.has(id)).toBe(false);
  });

  it("reschedules when the due time changes", async () => {
    const original = task({ id: "a", title: "Exercise" });
    await reconcileNotifications([original], settings, now);
    await reconcileNotifications([{ ...original, dueTime: "20:00" }], settings, now);
    const scheduled = adapter.pending.get(notificationIdFor("a", 0));
    expect(scheduled?.at).toBe(new Date(2026, 9, 3, 20, 0, 0).getTime());
  });

  it("gives recurring occurrences their own ids", () => {
    const recurring = task({ id: "a", title: "Exercise", recurrenceType: "DAILY" });
    const first = desiredNotifications([recurring], settings, now)[0];
    const second = desiredNotifications(
      [{ ...recurring, occurrence: 1, dueDate: "2026-10-04" }],
      settings,
      now,
    )[0];
    expect(first.id).not.toBe(second.id);
  });

  it("does nothing when permission is not granted", async () => {
    const denied: NotificationAdapter = {
      ensurePermission: async () => "denied",
      getPermission: async () => "denied",
      createChannels: async () => {},
      listPending: async () => [],
      schedule: async () => {},
      cancel: async () => {},
    };
    setNotificationAdapter(denied);
    const result = await reconcileNotifications([task({ id: "a", title: "x" })], settings, now);
    expect(result.scheduled).toBe(0);
    expect(result.permission).toBe("denied");
  });
});
