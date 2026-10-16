"use client";

import type { ReactNode } from "react";
import type { LocalTask } from "@/types/task";
import { PRIORITY_META } from "@/types/task";
import { PriorityBadge } from "./PriorityBadge";
import { formatTime12h, relativeDayLabel, toEpoch } from "@/utils/datetime";
import { IconCheck } from "./Icons";

export type TaskCardLayout = "timeline" | "upcoming" | "completed";

interface Props {
  task: LocalTask;
  layout?: TaskCardLayout;
  showDate?: boolean;
  onToggle: (id: string) => void;
  onOpen: (task: LocalTask) => void;
}

export function TaskCard({
  task,
  layout = "upcoming",
  showDate = false,
  onToggle,
  onOpen,
}: Props) {
  const completed = task.status === "COMPLETED";
  const meta = PRIORITY_META[task.priority];
  const overdue =
    !completed && task.dueDate && toEpoch(task.dueDate, task.dueTime) < Date.now();

  if (layout === "timeline") {
    return (
      <li className="relative grid grid-cols-[64px_18px_1fr] items-stretch gap-x-2">
        <div className="pt-4 text-right text-[11px] font-semibold leading-tight text-[#8B93A7]">
          {task.dueTime ? formatTime12h(task.dueTime) : "—"}
          {overdue ? <div className="mt-0.5 text-[10px] text-[#E23B40]">Overdue</div> : null}
        </div>
        <div className="relative flex justify-center">
          <span className="absolute inset-y-0 w-px bg-[#E6EAF2] dark:bg-white/10" aria-hidden />
          <span
            className={`relative z-10 mt-5 h-3 w-3 rounded-full ring-4 ring-white dark:ring-[#1b2238] ${meta.dot}`}
            aria-hidden
          />
        </div>
        <div className="pb-4">
          <CardBody
            task={task}
            completed={completed}
            overdue={!!overdue}
            showDate={false}
            onOpen={onOpen}
            onToggle={onToggle}
          />
        </div>
      </li>
    );
  }

  return (
    <li className="mb-3">
      <CardBody
        task={task}
        completed={completed}
        overdue={!!overdue}
        showDate={showDate}
        leading={
          layout === "completed" || completed ? (
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2ECC71] text-white">
              <IconCheck size={14} />
            </span>
          ) : (
            <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
          )
        }
        onOpen={onOpen}
        onToggle={onToggle}
      />
    </li>
  );
}

function CardBody({
  task,
  completed,
  overdue,
  showDate,
  leading,
  onOpen,
  onToggle,
}: {
  task: LocalTask;
  completed: boolean;
  overdue: boolean;
  showDate: boolean;
  leading?: ReactNode;
  onOpen: (task: LocalTask) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[22px] bg-white p-3.5 shadow-[0_8px_24px_rgba(28,41,72,0.06)] dark:bg-[#1b2238] dark:shadow-none ${
        completed ? "opacity-80" : ""
      }`}
    >
      {leading}
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`truncate text-[15px] font-semibold text-[#1B2340] dark:text-slate-50 ${
              completed ? "line-through decoration-[#8B93A7]" : ""
            }`}
          >
            {task.title}
          </p>
          <PriorityBadge priority={task.priority} />
        </div>
        {task.description ? (
          <p className="mt-0.5 line-clamp-1 text-[13px] text-[#8B93A7]">{task.description}</p>
        ) : null}
        {showDate && task.dueDate ? (
          <p className={`mt-1 text-[12px] ${overdue ? "font-semibold text-[#E23B40]" : "text-[#8B93A7]"}`}>
            {relativeDayLabel(task.dueDate)} · {task.dueTime ? formatTime12h(task.dueTime) : "No time"}
          </p>
        ) : task.dueTime && !showDate && leading ? (
          <p className="mt-0.5 text-[12px] text-[#8B93A7]">{formatTime12h(task.dueTime)}</p>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        aria-label={completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
          completed
            ? "border-[#2ECC71] bg-[#2ECC71] text-white"
            : "border-[#D5DBE7] bg-white hover:border-[#2ECC71] dark:border-slate-600 dark:bg-transparent"
        }`}
      >
        {completed ? <IconCheck size={14} /> : null}
      </button>
    </div>
  );
}
