"use client";

import { useMemo, useState } from "react";
import type { LocalTask } from "@/types/task";
import { EmptyState, TipCard } from "@/components/EmptyState";
import { TaskList } from "@/components/TaskList";
import { buildTodayBuckets } from "@/utils/taskGrouping";
import { formatGreetingDate, greetingFor, todayString } from "@/utils/datetime";
import { IconBell, IconGear, IconPlus } from "@/components/Icons";

interface Props {
  tasks: LocalTask[];
  onToggle: (id: string) => void;
  onOpen: (task: LocalTask) => void;
  onAdd: () => void;
  onSettings: () => void;
  onNotifications: () => void;
  permissionGranted: boolean;
}

type Filter = "all" | "pending" | "done";

export function TodayPage({
  tasks,
  onToggle,
  onOpen,
  onAdd,
  onSettings,
  onNotifications,
  permissionGranted,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const buckets = useMemo(() => buildTodayBuckets(tasks), [tasks]);
  const today = todayString();

  const dueToday = tasks.filter((task) => task.dueDate === today);
  const overduePending = buckets.overdue.filter((task) => task.dueDate !== today);
  const total = dueToday.length + overduePending.length;
  const done = dueToday.filter((task) => task.status === "COMPLETED").length;
  const pending = Math.max(0, total - done);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const pendingToday = [...buckets.overdue, ...buckets.today, ...buckets.noDate];
  const visible =
    filter === "done"
      ? buckets.completedToday
      : filter === "pending"
        ? pendingToday
        : [...pendingToday, ...buckets.completedToday];

  const empty = visible.length === 0;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#1B2340] dark:text-slate-50">
            {greetingFor()} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-0.5 text-[14px] text-[#8B93A7]">{formatGreetingDate()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNotifications}
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1B2340] shadow-[0_4px_14px_rgba(28,41,72,0.08)] dark:bg-[#1b2238] dark:text-slate-100"
          >
            <IconBell size={18} />
            {!permissionGranted ? (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#FF5A5F]" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={onSettings}
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1B2340] shadow-[0_4px_14px_rgba(28,41,72,0.08)] dark:bg-[#1b2238] dark:text-slate-100"
          >
            <IconGear size={18} />
          </button>
        </div>
      </header>

      {total > 0 ? (
        <section className="rounded-[24px] bg-white p-4 shadow-[0_8px_24px_rgba(28,41,72,0.06)] dark:bg-[#1b2238]">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold text-[#1B2340] dark:text-slate-50">
              Today&apos;s Progress
            </p>
            <span className="text-[13px] font-semibold text-[#8B93A7]">{percent}%</span>
          </div>
          <p className="mt-0.5 text-[13px] text-[#8B93A7]">
            {done} of {total} completed
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EEF2FA] dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[#2ECC71] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Total" value={total} tone="neutral" />
            <Stat label="Done" value={done} tone="done" />
            <Stat label="Pending" value={pending} tone="pending" />
          </div>
        </section>
      ) : null}

      {empty ? null : (
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[#1B2340] dark:text-slate-50">
            Today&apos;s Tasks
          </h2>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
            className="rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-[#1B2340] shadow-[0_4px_14px_rgba(28,41,72,0.06)] outline-none dark:bg-[#1b2238] dark:text-slate-100"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>
        </div>
      )}

      {empty ? (
        <div className="space-y-4">
          <EmptyState
            title="You're all clear!"
            description="No tasks scheduled for today. Take a moment to plan your day."
            action={
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-2 rounded-full bg-[#1B2340] px-6 py-3 text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-[#1B2340]"
              >
                <IconPlus size={16} /> Add a task
              </button>
            }
          />
          <TipCard
            title="Tip"
            body="Set reminders for important tasks so you never miss them."
          />
        </div>
      ) : (
        <TaskList
          layout="timeline"
          sections={[{ key: "today", heading: "", tasks: visible }]}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "done" | "pending";
}) {
  const styles = {
    neutral: "bg-[#F4F6FB] text-[#1B2340] dark:bg-white/5 dark:text-slate-100",
    done: "bg-[#E4F8EC] text-[#1FA85A] dark:bg-emerald-500/15 dark:text-emerald-300",
    pending: "bg-[#FFE8EA] text-[#E23B40] dark:bg-rose-500/15 dark:text-rose-300",
  }[tone];
  return (
    <div className={`rounded-2xl px-3 py-3 text-center ${styles}`}>
      <p className="text-[22px] font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[12px] font-medium opacity-80">{label}</p>
    </div>
  );
}
