"use client";

import { useMemo, useState } from "react";
import type { LocalTask } from "@/types/task";
import { EmptyState } from "@/components/EmptyState";
import { TaskList, type TaskSection } from "@/components/TaskList";
import { groupUpcomingByDate } from "@/utils/taskGrouping";
import { addDays, formatLongDate, relativeDayLabel, todayString } from "@/utils/datetime";
import { IconSearch } from "@/components/Icons";

interface Props {
  tasks: LocalTask[];
  onToggle: (id: string) => void;
  onOpen: (task: LocalTask) => void;
}

type Range = "all" | "week" | "month";

export function UpcomingPage({ tasks, onToggle, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [searchOpen, setSearchOpen] = useState(false);

  const groups = useMemo(() => {
    const today = todayString();
    const weekEnd = addDays(today, 7);
    const monthEnd = addDays(today, 31);
    let filtered = groupUpcomingByDate(tasks);
    if (range === "week") filtered = filtered.filter((g) => g.date <= weekEnd);
    if (range === "month") filtered = filtered.filter((g) => g.date <= monthEnd);
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered
        .map((g) => ({
          ...g,
          tasks: g.tasks.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              (t.description ?? "").toLowerCase().includes(q),
          ),
        }))
        .filter((g) => g.tasks.length > 0);
    }
    return filtered;
  }, [tasks, range, query]);

  const sections: TaskSection[] = groups.map((group) => ({
    key: group.date,
    heading: relativeDayLabel(group.date),
    subheading: formatLongDate(group.date),
    tasks: group.tasks,
  }));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold tracking-tight text-[#1B2340] dark:text-slate-50">
          Upcoming
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
          placeholder="Search upcoming tasks"
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#E6EAF2] dark:bg-[#1b2238] dark:ring-white/10"
        />
      ) : null}

      <div className="flex gap-2">
        {(
          [
            ["all", "All"],
            ["week", "This Week"],
            ["month", "This Month"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setRange(value)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
              range === value
                ? "bg-[#1B2340] text-white dark:bg-white dark:text-[#1B2340]"
                : "bg-white text-[#8B93A7] dark:bg-[#1b2238]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sections.length === 0 ? (
        <EmptyState
          title="No upcoming tasks"
          description="Future tasks you schedule will show up here, grouped by day."
        />
      ) : (
        <TaskList
          layout="upcoming"
          sections={sections}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}
