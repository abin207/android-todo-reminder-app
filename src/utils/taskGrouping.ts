import type { LocalTask } from "@/types/task";
import { PRIORITY_META } from "@/types/task";
import { todayString, toEpoch } from "./datetime";

export function byDueThenPriority(a: LocalTask, b: LocalTask): number {
  const aTime = a.dueDate ? toEpoch(a.dueDate, a.dueTime) : Number.MAX_SAFE_INTEGER;
  const bTime = b.dueDate ? toEpoch(b.dueDate, b.dueTime) : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  return PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
}

export interface TodayBuckets {
  overdue: LocalTask[];
  today: LocalTask[];
  noDate: LocalTask[];
  completedToday: LocalTask[];
}

export function buildTodayBuckets(tasks: LocalTask[], now: Date = new Date()): TodayBuckets {
  const today = todayString(now);
  const nowMs = now.getTime();
  const pending = tasks.filter((task) => task.status === "PENDING");

  return {
    overdue: pending
      .filter(
        (task) =>
          task.dueDate &&
          (task.dueDate < today ||
            (task.dueDate === today && toEpoch(task.dueDate, task.dueTime) < nowMs)),
      )
      .sort(byDueThenPriority),
    today: pending
      .filter(
        (task) =>
          task.dueDate === today && toEpoch(task.dueDate, task.dueTime) >= nowMs,
      )
      .sort(byDueThenPriority),
    noDate: pending.filter((task) => !task.dueDate).sort(byDueThenPriority),
    completedToday: tasks
      .filter(
        (task) =>
          task.status === "COMPLETED" &&
          task.completedAt &&
          todayString(new Date(task.completedAt)) === today,
      )
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
  };
}

export function groupUpcomingByDate(
  tasks: LocalTask[],
  now: Date = new Date(),
): Array<{ date: string; tasks: LocalTask[] }> {
  const today = todayString(now);
  const map = new Map<string, LocalTask[]>();

  tasks
    .filter((task) => task.status === "PENDING" && task.dueDate && task.dueDate > today)
    .sort(byDueThenPriority)
    .forEach((task) => {
      const key = task.dueDate as string;
      map.set(key, [...(map.get(key) ?? []), task]);
    });

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, grouped]) => ({ date, tasks: grouped }));
}
