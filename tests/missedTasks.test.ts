import { describe, expect, it } from "vitest";
import { findMissedTasks } from "@/services/missedTaskService";
import { buildMissedSummaryNotification } from "@/services/notificationService";
import { DEFAULT_SETTINGS } from "@/services/settingsService";
import type { Task } from "@/types/task";

function task(partial: Partial<Task> & { id: string; title: string }): Task {
  return {
    description: null,
    dueDate: "2026-10-03",
    dueTime: "18:00",
    priority: "MEDIUM",
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

const tasks: Task[] = [
  task({ id: "1", title: "Exercise", dueTime: "18:00" }),
  task({ id: "2", title: "ML", dueTime: "19:00" }),
  task({ id: "3", title: "Reading", dueTime: "20:00", status: "COMPLETED", completedAt: 1 }),
  task({ id: "4", title: "Late night", dueTime: "23:30" }),
  task({ id: "5", title: "Tomorrow", dueDate: "2026-10-04", dueTime: "09:00" }),
];

const summaryAt = new Date(2026, 9, 3, 22, 0, 0);

describe("findMissedTasks", () => {
  it("returns only incomplete tasks that were due earlier today", () => {
    const missed = findMissedTasks(tasks, summaryAt).map((t) => t.title);
    expect(missed).toEqual(["Exercise", "ML"]);
  });

  it("ignores completed, future and other-day tasks", () => {
    const missed = findMissedTasks(tasks, summaryAt).map((t) => t.title);
    expect(missed).not.toContain("Reading");
    expect(missed).not.toContain("Late night");
    expect(missed).not.toContain("Tomorrow");
  });

  it("returns nothing when everything is done", () => {
    const done = tasks.map((t) => ({ ...t, status: "COMPLETED" as const }));
    expect(findMissedTasks(done, summaryAt)).toHaveLength(0);
  });
});

describe("buildMissedSummaryNotification", () => {
  const now = new Date(2026, 9, 3, 21, 0, 0);

  it("builds a single consolidated notification", () => {
    const notification = buildMissedSummaryNotification(tasks, DEFAULT_SETTINGS, now);
    expect(notification).not.toBeNull();
    expect(notification?.title).toBe("⚠️ Missed Tasks");
    expect(notification?.body).toContain("• Exercise");
    expect(notification?.body).toContain("• ML");
    expect(notification?.body).not.toContain("Reading");
  });

  it("produces no notification when nothing was missed", () => {
    const done = tasks.map((t) => ({ ...t, status: "COMPLETED" as const }));
    expect(buildMissedSummaryNotification(done, DEFAULT_SETTINGS, now)).toBeNull();
  });

  it("produces no notification once the summary time has passed", () => {
    const late = new Date(2026, 9, 3, 23, 0, 0);
    expect(buildMissedSummaryNotification(tasks, DEFAULT_SETTINGS, late)).toBeNull();
  });
});
