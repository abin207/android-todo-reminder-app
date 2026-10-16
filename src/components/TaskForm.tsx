"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  PRIORITIES,
  RECURRENCE_LABELS,
  RECURRENCE_TYPES,
  type LocalTask,
  type Priority,
  type RecurrenceType,
  type TaskInput,
} from "@/types/task";
import { todayString } from "@/utils/datetime";
import { validateTaskInput, ValidationError } from "@/services/taskService";
import { IconBell, IconCheck, IconChevronDown, IconClose, IconInfo } from "./Icons";
import { Toggle } from "./Toggle";
import { DateField, TimeField } from "./DateTimePicker";

const WEEKDAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  open: boolean;
  initialTask?: LocalTask | null;
  onClose: () => void;
  onSubmit: (input: TaskInput) => Promise<void>;
}

const PRIORITY_CARD: Record<
  Priority,
  { wrap: string; active: string; iconWrap: string; icon: ReactNode; caption: string }
> = {
  LOW: {
    wrap: "bg-[#E6F8EE] text-[#1FA85A]",
    active: "ring-2 ring-[#2ECC71] ring-offset-2 ring-offset-[#EEF2FA]",
    iconWrap: "bg-white text-[#1FA85A]",
    icon: <IconCheck size={14} />,
    caption: "Low",
  },
  MEDIUM: {
    wrap: "bg-[#FFF3D6] text-[#D09212]",
    active: "ring-2 ring-[#F5B942] ring-offset-2 ring-offset-[#EEF2FA]",
    iconWrap: "bg-white text-[#D09212]",
    icon: <span className="text-[13px] font-black leading-none">!</span>,
    caption: "Medium",
  },
  HIGH: {
    wrap: "bg-[#FFE6E8] text-[#E23B40]",
    active: "ring-2 ring-[#FF5A5F] ring-offset-2 ring-offset-[#EEF2FA]",
    iconWrap: "bg-white text-[#E23B40]",
    icon: <span className="text-[15px] font-bold leading-none">+</span>,
    caption: "High",
  },
};

export function TaskForm({ open, initialTask, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(todayString());
  const [dueTime, setDueTime] = useState("18:00");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("NEVER");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setRepeatOpen(false);
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description ?? "");
      setDueDate(initialTask.dueDate ?? todayString());
      setDueTime(initialTask.dueTime ?? "18:00");
      setPriority(initialTask.priority);
      setReminderEnabled(initialTask.reminderEnabled);
      setRecurrenceType(initialTask.recurrenceType);
      setWeekdays(initialTask.recurrenceRule?.weekdays ?? []);
      setIntervalDays(initialTask.recurrenceRule?.intervalDays ?? 2);
    } else {
      setTitle("");
      setDescription("");
      setDueDate(todayString());
      setDueTime("18:00");
      setPriority("MEDIUM");
      setReminderEnabled(true);
      setRecurrenceType("NEVER");
      setWeekdays([]);
      setIntervalDays(2);
    }
  }, [open, initialTask]);

  const input = useMemo<TaskInput>(
    () => ({
      title,
      description,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      priority,
      reminderEnabled,
      recurrenceType,
      recurrenceRule:
        recurrenceType === "CUSTOM"
          ? {
              weekdays: weekdays.length ? weekdays : undefined,
              intervalDays: weekdays.length ? undefined : intervalDays,
            }
          : recurrenceType === "WEEKLY" && weekdays.length
            ? { weekdays }
            : null,
    }),
    [
      title,
      description,
      dueDate,
      dueTime,
      priority,
      reminderEnabled,
      recurrenceType,
      weekdays,
      intervalDays,
    ],
  );

  if (!open) return null;

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError(null);
    try {
      validateTaskInput(input);
    } catch (validationError) {
      setError(
        validationError instanceof ValidationError
          ? validationError.message
          : "Please check the task details.",
      );
      return;
    }
    setSaving(true);
    try {
      await onSubmit(input);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-[#EEF2FA] dark:bg-[#0f1424]">
      <form
        onSubmit={handleSubmit}
        className="flex h-full w-full max-w-lg flex-col px-5 pt-3 pb-4"
      >
        <header className="flex items-center justify-between py-1">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#1B2340] dark:text-slate-100"
          >
            <IconClose size={20} />
          </button>
          <h2 className="text-[18px] font-bold text-[#1B2340] dark:text-slate-50">
            {initialTask ? "Edit Task" : "Add Task"}
          </h2>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#1B2340] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(27,35,64,0.18)] disabled:opacity-60 dark:bg-white dark:text-[#1B2340]"
          >
            {saving ? "Saving" : "Save"}
          </button>
        </header>

        <div className="no-scrollbar mt-4 flex-1 space-y-5 overflow-y-auto pb-6">
          {error ? (
            <p
              role="alert"
              className="rounded-2xl bg-[#FFE8EA] px-4 py-3 text-sm font-medium text-[#E23B40]"
            >
              {error}
            </p>
          ) : null}

          <Field label="Title *">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Exercise"
              autoFocus
              className="field-input"
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. 30 minute workout"
              rows={3}
              className="field-input min-h-[88px] resize-none"
            />
          </Field>

          <Field label="Date">
            <DateField value={dueDate} onChange={setDueDate} />
          </Field>

          <Field label="Time">
            <TimeField value={dueTime} onChange={setDueTime} />
          </Field>

          <fieldset>
            <legend className="mb-2.5 text-[13px] font-semibold text-[#1B2340] dark:text-slate-200">
              Priority
            </legend>
            <div className="grid grid-cols-3 gap-2.5">
              {PRIORITIES.map((value) => {
                const card = PRIORITY_CARD[value];
                const selected = priority === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriority(value)}
                    aria-pressed={selected}
                    className={`flex flex-col items-center gap-2 rounded-[20px] py-3.5 transition ${card.wrap} ${
                      selected ? card.active : ""
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${card.iconWrap}`}
                    >
                      {card.icon}
                    </span>
                    <span className="text-[13px] font-semibold">{card.caption}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-[#1B2340] dark:text-slate-200">
              Repeat
            </p>
            <button
              type="button"
              onClick={() => setRepeatOpen((prev) => !prev)}
              className="field-input flex w-full items-center justify-between text-left"
            >
              <span className="text-[15px] font-medium">{RECURRENCE_LABELS[recurrenceType]}</span>
              <IconChevronDown
                size={18}
                className={`text-[#8B93A7] transition ${repeatOpen ? "rotate-180" : ""}`}
              />
            </button>
            {repeatOpen ? (
              <ul className="mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_rgba(28,41,72,0.1)] dark:bg-[#1b2238]">
                {RECURRENCE_TYPES.map((value) => (
                  <li key={value}>
                    <button
                      type="button"
                      onClick={() => {
                        setRecurrenceType(value);
                        setRepeatOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-[14px] ${
                        recurrenceType === value
                          ? "bg-[#F4F6FB] font-semibold text-[#1B2340] dark:bg-white/10 dark:text-slate-50"
                          : "text-[#1B2340] dark:text-slate-200"
                      }`}
                    >
                      {RECURRENCE_LABELS[value]}
                      {recurrenceType === value ? <IconCheck size={16} /> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {recurrenceType === "WEEKLY" || recurrenceType === "CUSTOM" ? (
            <div className="rounded-[20px] bg-white p-4 dark:bg-[#1b2238]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8B93A7]">
                Repeat on
              </p>
              <div className="mt-3 flex justify-between">
                {WEEKDAY_NAMES.map((name, index) => (
                  <button
                    key={`${WEEKDAY_LABELS[index]}-${index}`}
                    type="button"
                    onClick={() => toggleWeekday(index)}
                    aria-label={WEEKDAY_LABELS[index]}
                    aria-pressed={weekdays.includes(index)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold ${
                      weekdays.includes(index)
                        ? "bg-[#1B2340] text-white dark:bg-white dark:text-[#1B2340]"
                        : "bg-[#F4F6FB] text-[#8B93A7] dark:bg-white/10"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {recurrenceType === "CUSTOM" && weekdays.length === 0 ? (
                <label className="mt-4 block text-[12px] font-semibold text-[#8B93A7]">
                  Every N days
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={intervalDays}
                    onChange={(event) => setIntervalDays(Number(event.target.value))}
                    className="field-input mt-1.5 w-28"
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-[20px] bg-white px-4 py-3.5 dark:bg-[#1b2238]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F6FB] text-[#8B93A7] dark:bg-white/10">
                <IconBell size={18} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-[#1B2340] dark:text-slate-100">
                  Reminder
                </p>
                <p className="text-[12px] text-[#8B93A7]">Notify at the due time</p>
              </div>
            </div>
            <Toggle
              label="Reminder"
              checked={reminderEnabled}
              onChange={setReminderEnabled}
            />
          </div>

          {reminderEnabled ? (
            <div className="flex items-start gap-3 rounded-[20px] bg-[#E8F0FF] px-4 py-3.5 text-[13px] leading-relaxed text-[#3B6FE0] dark:bg-blue-500/10 dark:text-blue-200">
              <span className="mt-0.5">
                <IconInfo size={16} />
              </span>
              A notification will be sent at the selected time.
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block">
      <p className="text-[13px] font-semibold text-[#1B2340] dark:text-slate-200">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
