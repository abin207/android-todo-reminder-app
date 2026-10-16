import { describe, expect, it } from "vitest";
import { nextOccurrenceDate, rollForward } from "@/services/recurrenceService";
import type { Task } from "@/types/task";

const base: Task = {
  id: "t1",
  title: "Exercise",
  description: null,
  dueDate: "2026-10-03",
  dueTime: "18:00",
  priority: "HIGH",
  status: "PENDING",
  reminderEnabled: true,
  recurrenceType: "DAILY",
  recurrenceRule: null,
  occurrence: 0,
  createdAt: 0,
  updatedAt: 0,
  completedAt: null,
  deletedAt: null,
};

describe("nextOccurrenceDate", () => {
  it("handles daily", () => {
    expect(nextOccurrenceDate("2026-10-03", "DAILY", null)).toBe("2026-10-04");
  });

  it("handles weekly", () => {
    expect(nextOccurrenceDate("2026-10-03", "WEEKLY", null)).toBe("2026-10-10");
  });

  it("handles weekly with explicit weekdays (Mon/Wed/Fri)", () => {
    // 2026-10-05 is a Monday.
    expect(nextOccurrenceDate("2026-10-05", "WEEKLY", { weekdays: [1, 3, 5] })).toBe(
      "2026-10-07",
    );
  });

  it("skips weekends for WEEKDAYS", () => {
    // 2026-10-02 is a Friday -> next weekday is Monday 2026-10-05.
    expect(nextOccurrenceDate("2026-10-02", "WEEKDAYS", null)).toBe("2026-10-05");
  });

  it("clamps month-end dates", () => {
    expect(nextOccurrenceDate("2026-01-31", "MONTHLY", null)).toBe("2026-02-28");
  });

  it("clamps month-end dates on leap years", () => {
    expect(nextOccurrenceDate("2028-01-31", "MONTHLY", null)).toBe("2028-02-29");
  });

  it("supports custom interval days", () => {
    expect(nextOccurrenceDate("2026-10-03", "CUSTOM", { intervalDays: 3 })).toBe(
      "2026-10-06",
    );
  });

  it("returns null for non recurring tasks", () => {
    expect(nextOccurrenceDate("2026-10-03", "NEVER", null)).toBeNull();
  });
});

describe("rollForward", () => {
  it("advances occurrence and resets status", () => {
    const next = rollForward(base, "2026-10-03");
    expect(next?.dueDate).toBe("2026-10-04");
    expect(next?.occurrence).toBe(1);
    expect(next?.status).toBe("PENDING");
    expect(next?.completedAt).toBeNull();
  });

  it("catches up to the first non-past occurrence", () => {
    const stale = { ...base, dueDate: "2026-09-01" };
    const next = rollForward(stale, "2026-10-03");
    expect(next?.dueDate).toBe("2026-10-03");
  });

  it("returns null for non recurring tasks", () => {
    expect(rollForward({ ...base, recurrenceType: "NEVER" }, "2026-10-03")).toBeNull();
  });
});
