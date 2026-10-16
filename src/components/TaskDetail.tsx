"use client";

import { useState, type ReactNode } from "react";
import type { LocalTask } from "@/types/task";
import { PRIORITY_META } from "@/types/task";
import { PriorityBadge } from "./PriorityBadge";
import { describeRecurrence } from "@/services/recurrenceService";
import { formatShortDate, formatTime12h } from "@/utils/datetime";
import {
  IconBack,
  IconBell,
  IconCalendar,
  IconCheck,
  IconClock,
  IconPencil,
  IconRepeat,
  IconTrash,
} from "./Icons";

interface Props {
  task: LocalTask | null;
  onClose: () => void;
  onEdit: (task: LocalTask) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskDetail({ task, onClose, onEdit, onToggle, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  if (!task) return null;

  const completed = task.status === "COMPLETED";
  const meta = PRIORITY_META[task.priority];
  const recurrence = describeRecurrence(task.recurrenceType, task.recurrenceRule);

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-[#EEF2FA] dark:bg-slate-950">
      <div className="flex h-full w-full max-w-2xl flex-col px-5 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#1B2340] dark:text-slate-100"
          >
            <IconBack size={20} />
          </button>
          <h2 className="text-[17px] font-bold text-[#1B2340] dark:text-slate-50">Task Details</h2>
          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onDelete(task.id);
                  onClose();
                }}
                className="rounded-full bg-[#FF5A5F] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full px-2 py-1.5 text-xs text-[#8B93A7]"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Delete task"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#FF5A5F]"
            >
              <IconTrash size={18} />
            </button>
          )}
        </div>

        <div className="mt-5 flex-1 space-y-4 overflow-y-auto">
          <section className="rounded-[24px] bg-white p-5 shadow-[0_8px_24px_rgba(28,41,72,0.06)] dark:bg-[#1b2238]">
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-3.5 w-3.5 rounded-full ${meta.dot}`} />
              <div>
                <h1 className="text-[22px] font-extrabold text-[#1B2340] dark:text-slate-50">
                  {task.title}
                </h1>
                <div className="mt-2">
                  <PriorityBadge priority={task.priority} size="md" />
                </div>
              </div>
            </div>

            <ul className="mt-5 space-y-3 text-[14px] text-[#1B2340] dark:text-slate-200">
              <DetailRow
                icon={<IconCalendar size={18} />}
                label={task.dueDate ? formatShortDate(task.dueDate) : "No date"}
              />
              <DetailRow
                icon={<IconClock size={18} />}
                label={task.dueTime ? formatTime12h(task.dueTime) : "No time"}
              />
              <DetailRow
                icon={<IconRepeat size={18} />}
                label={recurrence ? `Repeats: ${recurrence}` : "Does not repeat"}
              />
              <DetailRow
                icon={<IconBell size={18} />}
                label={task.reminderEnabled ? "Reminder: Enabled" : "Reminder: Off"}
              />
            </ul>
          </section>

          {task.description ? (
            <section className="rounded-[24px] bg-white p-5 shadow-[0_8px_24px_rgba(28,41,72,0.06)] dark:bg-[#1b2238]">
              <p className="text-[13px] font-semibold text-[#8B93A7]">Description</p>
              <p className="mt-1 text-[15px] leading-relaxed text-[#1B2340] dark:text-slate-100">
                {task.description}
              </p>
            </section>
          ) : null}

          <section className="flex items-center justify-between rounded-[24px] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(28,41,72,0.06)] dark:bg-[#1b2238]">
            <p className="text-[13px] font-semibold text-[#8B93A7]">Status</p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                completed
                  ? "bg-[#E4F8EC] text-[#1FA85A]"
                  : "bg-[#FFF4D6] text-[#C98912]"
              }`}
            >
              {completed ? "Completed" : "Pending"}
            </span>
          </section>
        </div>

        <div className="space-y-2 pt-3">
          <button
            type="button"
            onClick={() => {
              onToggle(task.id);
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1B2340] py-3.5 text-[15px] font-semibold text-white dark:bg-white dark:text-[#1B2340]"
          >
            <IconCheck size={18} />
            {completed ? "Reopen task" : "Mark as Complete"}
          </button>
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-[#1B2340] shadow-[0_8px_24px_rgba(28,41,72,0.06)] dark:bg-[#1b2238] dark:text-slate-100"
          >
            <IconPencil size={16} />
            Edit Task
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="text-[#8B93A7]">{icon}</span>
      <span>{label}</span>
    </li>
  );
}
