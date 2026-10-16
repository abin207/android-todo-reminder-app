"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addDays,
  addMonthsClamped,
  formatShortDate,
  formatTime12h,
  parseDateString,
  toDateString,
  todayString,
} from "@/utils/datetime";
import { IconBack, IconCalendar, IconChevron, IconClock } from "./Icons";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function toHour12(hh: number): { hour: number; period: "AM" | "PM" } {
  const period: "AM" | "PM" = hh >= 12 ? "PM" : "AM";
  const hour = hh % 12 === 0 ? 12 : hh % 12;
  return { hour, period };
}

function fromHour12(hour: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function parseTime(value: string): { hour: number; minute: number; period: "AM" | "PM" } {
  const [hh, mm] = (value || "18:00").split(":").map(Number);
  const { hour, period } = toHour12(hh);
  return { hour, minute: mm, period };
}

function monthTitle(cursor: string): string {
  return parseDateString(cursor).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function buildGrid(cursor: string): Array<string | null> {
  const date = parseDateString(cursor);
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1).getDay();
  const last = new Date(year, month + 1, 0).getDate();
  const cells: Array<string | null> = [];
  for (let i = 0; i < first; i += 1) cells.push(null);
  for (let day = 1; day <= last; day += 1) {
    cells.push(toDateString(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(value || todayString());

  useEffect(() => {
    if (open) setCursor(value || todayString());
  }, [open, value]);

  const grid = useMemo(() => buildGrid(cursor), [cursor]);
  const today = todayString();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="field-input flex w-full items-center gap-3 text-left"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#8B93A7] dark:bg-white/10">
          <IconCalendar size={18} />
        </span>
        <span className="flex-1 text-[15px] font-medium text-[#1B2340] dark:text-slate-50">
          {value ? formatShortDate(value) : "Pick a date"}
        </span>
      </button>

      {open ? (
        <Sheet title="Select date" onClose={() => setOpen(false)}>
          <div className="mb-3 flex gap-2">
            <Chip
              label="Today"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
            />
            <Chip
              label="Tomorrow"
              onClick={() => {
                onChange(addDays(today, 1));
                setOpen(false);
              }}
            />
          </div>

          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor(addMonthsClamped(cursor.slice(0, 8) + "01", -1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F6FB] text-[#1B2340] dark:bg-white/10 dark:text-slate-100"
            >
              <IconBack size={16} />
            </button>
            <p className="text-[15px] font-bold text-[#1B2340] dark:text-slate-50">
              {monthTitle(cursor)}
            </p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCursor(addMonthsClamped(cursor.slice(0, 8) + "01", 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F6FB] text-[#1B2340] dark:bg-white/10 dark:text-slate-100"
            >
              <IconChevron size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-[11px] font-semibold text-[#8B93A7]">
                {day}
              </span>
            ))}
            {grid.map((day, index) =>
              day ? (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold ${
                    day === value
                      ? "bg-[#1B2340] text-white dark:bg-white dark:text-[#1B2340]"
                      : day === today
                        ? "bg-[#E8F0FF] text-[#3B6FE0]"
                        : "text-[#1B2340] hover:bg-[#F4F6FB] dark:text-slate-100 dark:hover:bg-white/10"
                  }`}
                >
                  {Number(day.slice(8))}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
        </Sheet>
      ) : null}
    </>
  );
}

export function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseTime(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(nearestMinute(parsed.minute));
  const [period, setPeriod] = useState<"AM" | "PM">(parsed.period);

  useEffect(() => {
    if (!open) return;
    const next = parseTime(value);
    setHour(next.hour);
    setMinute(nearestMinute(next.minute));
    setPeriod(next.period);
  }, [open, value]);

  const commit = (nextHour: number, nextMinute: number, nextPeriod: "AM" | "PM") => {
    const hh = `${fromHour12(nextHour, nextPeriod)}`.padStart(2, "0");
    const mm = `${nextMinute}`.padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="field-input flex w-full items-center gap-3 text-left"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#8B93A7] dark:bg-white/10">
          <IconClock size={18} />
        </span>
        <span className="flex-1 text-[15px] font-medium text-[#1B2340] dark:text-slate-50">
          {value ? formatTime12h(value) : "Pick a time"}
        </span>
      </button>

      {open ? (
        <Sheet title="Select time" onClose={() => setOpen(false)}>
          <p className="mb-4 text-center text-[28px] font-extrabold text-[#1B2340] dark:text-slate-50">
            {formatTime12h(
              `${`${fromHour12(hour, period)}`.padStart(2, "0")}:${`${minute}`.padStart(2, "0")}`,
            )}
          </p>

          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#8B93A7]">
            Hour
          </p>
          <div className="mb-4 grid grid-cols-6 gap-1.5">
            {HOURS_12.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setHour(item);
                  commit(item, minute, period);
                }}
                className={`rounded-xl py-2 text-sm font-semibold ${
                  hour === item
                    ? "bg-[#1B2340] text-white dark:bg-white dark:text-[#1B2340]"
                    : "bg-[#F4F6FB] text-[#1B2340] dark:bg-white/10 dark:text-slate-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#8B93A7]">
            Minute
          </p>
          <div className="mb-4 grid grid-cols-6 gap-1.5">
            {MINUTES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMinute(item);
                  commit(hour, item, period);
                }}
                className={`rounded-xl py-2 text-sm font-semibold ${
                  minute === item
                    ? "bg-[#1B2340] text-white dark:bg-white dark:text-[#1B2340]"
                    : "bg-[#F4F6FB] text-[#1B2340] dark:bg-white/10 dark:text-slate-100"
                }`}
              >
                {`${item}`.padStart(2, "0")}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["AM", "PM"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setPeriod(item);
                  commit(hour, minute, item);
                }}
                className={`rounded-2xl py-3 text-sm font-bold ${
                  period === item
                    ? "bg-[#1B2340] text-white dark:bg-white dark:text-[#1B2340]"
                    : "bg-[#F4F6FB] text-[#8B93A7] dark:bg-white/10"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-2xl bg-[#1B2340] py-3 text-sm font-semibold text-white dark:bg-white dark:text-[#1B2340]"
          >
            Done
          </button>
        </Sheet>
      ) : null}
    </>
  );
}

function nearestMinute(value: number): number {
  const snapped = Math.round(value / 5) * 5;
  return snapped === 60 ? 55 : snapped;
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-[#E8F0FF] px-3 py-1.5 text-[12px] font-semibold text-[#3B6FE0]"
    >
      {label}
    </button>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-[#1B2340]/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-[28px] bg-white p-5 shadow-2xl dark:bg-[#1b2238] sm:rounded-[28px]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E6EAF2] sm:hidden" />
        <p className="mb-4 text-center text-[16px] font-bold text-[#1B2340] dark:text-slate-50">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}
