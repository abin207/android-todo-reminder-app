"use client";

import { useMemo, useState } from "react";
import type { LocalTask } from "@/types/task";
import { EmptyState } from "@/components/EmptyState";
import { TaskList, type TaskSection } from "@/components/TaskList";
import { formatLongDate, relativeDayLabel, todayString } from "@/utils/datetime";
import { IconSearch } from "@/components/Icons";

interface Props {
  tasks: LocalTask[];
  onToggle: (id: string) => void;
  onOpen: (task: LocalTask) => void;
}

export function CompletedPage({ tasks, onToggle, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const sections = useMemo<TaskSection[]>(() => {
    const q = query.trim().toLowerCase();
    const completed = tasks
      .filter((task) => task.status === "COMPLETED")
      .filter(
        (task) =>
          !q ||
          task.title.toLowerCase().includes(q) ||
          (task.description ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => (b.completedAt ?? b.updatedAt) - (a.completedAt ?? a.updatedAt));

    const map = new Map<string, LocalTask[]>();
    completed.forEach((task) => {
      const day = task.completedAt ? todayString(new Date(task.completedAt)) : "unknown";
      map.set(day, [...(map.get(day) ?? []), task]);
    });

    return [...map.entries()].map(([day, grouped]) => ({
      key: day,
      heading: day === "unknown" ? "Completed" : relativeDayLabel(day),
      subheading: day === "unknown" ? undefined : formatLongDate(day),
      tasks: grouped,
    }));
  }, [tasks, query]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold tracking-tight text-[#1B2340] dark:text-slate-50">
          Completed
        </h1>
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Search"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1B2340] shadow-[0_4px_14px_rgba(28,41,72,0.08)] dark:bg-[#1b2238] dark:text-slate-100"
        >
          <IconSearch size={18} />
        </button>
      </header>

      {searchOpen ? (
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search completed tasks"
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#E6EAF2] dark:bg-[#1b2238] dark:ring-white/10"
        />
      ) : null}

      {sections.length === 0 ? (
        <EmptyState
          title="Nothing completed yet"
          description="Finished tasks will be collected here. Tap a circle on Today to complete one."
        />
      ) : (
        <TaskList
          layout="completed"
          sections={sections}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}
