import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryStore, setLocalStore } from "@/database/localStore";
import {
  completeTask,
  createTask,
  deleteTask,
  listTasks,
  reopenTask,
  updateTask,
  validateTaskInput,
  ValidationError,
} from "@/services/taskService";
import type { TaskInput } from "@/types/task";

const baseInput: TaskInput = {
  title: "Exercise",
  description: "Evening run",
  dueDate: "2026-10-03",
  dueTime: "18:00",
  priority: "HIGH",
  reminderEnabled: true,
  recurrenceType: "NEVER",
  recurrenceRule: null,
};

beforeEach(() => {
  setLocalStore(createMemoryStore());
});

describe("validation", () => {
  it("requires a title", () => {
    expect(() => validateTaskInput({ ...baseInput, title: "  " })).toThrow(ValidationError);
  });

  it("requires date and time when the reminder is on", () => {
    expect(() => validateTaskInput({ ...baseInput, dueDate: null })).toThrow(ValidationError);
    expect(() => validateTaskInput({ ...baseInput, dueTime: null })).toThrow(ValidationError);
  });

  it("rejects invalid dates and times", () => {
    expect(() => validateTaskInput({ ...baseInput, dueDate: "2026-02-30" })).toThrow();
    expect(() => validateTaskInput({ ...baseInput, dueTime: "25:00" })).toThrow();
  });

  it("allows undated tasks when the reminder is off", () => {
    expect(() =>
      validateTaskInput({
        ...baseInput,
        reminderEnabled: false,
        dueDate: null,
        dueTime: null,
      }),
    ).not.toThrow();
  });
});

describe("task lifecycle", () => {
  it("creates a pending dirty task", async () => {
    const task = await createTask(baseInput);
    expect(task.status).toBe("PENDING");
    expect(task.dirty).toBe(true);
    expect(await listTasks()).toHaveLength(1);
  });

  it("edits a task and bumps updatedAt", async () => {
    const task = await createTask(baseInput);
    const updated = await updateTask(task.id, { ...baseInput, title: "Morning run" });
    expect(updated.title).toBe("Morning run");
    expect(updated.updatedAt).toBeGreaterThanOrEqual(task.updatedAt);
  });

  it("completes and reopens a task", async () => {
    const task = await createTask(baseInput);
    const { completed, next } = await completeTask(task.id);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
    expect(next).toBeNull();

    const reopened = await reopenTask(task.id);
    expect(reopened.status).toBe("PENDING");
    expect(reopened.completedAt).toBeNull();
  });

  it("rolls a recurring task forward on completion", async () => {
    const task = await createTask({
      ...baseInput,
      dueDate: "2099-01-01",
      recurrenceType: "DAILY",
    });
    const { completed, next } = await completeTask(task.id);
    expect(completed.status).toBe("COMPLETED");
    expect(next?.dueDate).toBe("2099-01-02");
    expect(next?.occurrence).toBe(1);
    expect(next?.status).toBe("PENDING");
  });

  it("soft deletes with a tombstone", async () => {
    const task = await createTask(baseInput);
    const deleted = await deleteTask(task.id);
    expect(deleted?.deletedAt).not.toBeNull();
    expect(await listTasks()).toHaveLength(0);
  });
});
