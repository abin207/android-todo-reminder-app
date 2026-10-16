import type { Task } from "@/types/task";
import { toEpoch, todayString } from "@/utils/datetime";

/**
 * Missed-task summary logic.
 *
 * A task counts as missed when it is scheduled for *today*, its due instant
 * has already passed at summary time, and it is still PENDING.
 * Completed tasks, future tasks and deleted tasks are excluded.
 */
export function findMissedTasks(tasks: Task[], at: Date = new Date()): Task[] {
  const today = todayString(at);
  const now = at.getTime();

  return tasks
    .filter((task) => !task.deletedAt)
    .filter((task) => task.status === "PENDING")
    .filter((task) => task.dueDate === today)
    .filter((task) => toEpoch(task.dueDate as string, task.dueTime) <= now)
    .sort(
      (a, b) =>
        toEpoch(a.dueDate as string, a.dueTime) - toEpoch(b.dueDate as string, b.dueTime),
    );
}

export function buildMissedSummaryBody(tasks: Task[]): string {
  const lines = tasks.slice(0, 8).map((task) => `• ${task.title}`);
  if (tasks.length > 8) lines.push(`• and ${tasks.length - 8} more`);
  return `You missed:\n${lines.join("\n")}\n\nOpen the app to review them.`;
}
