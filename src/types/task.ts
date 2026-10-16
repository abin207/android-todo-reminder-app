export const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["PENDING", "COMPLETED"] as const;
export type Status = (typeof STATUSES)[number];

export const RECURRENCE_TYPES = [
  "NEVER",
  "DAILY",
  "WEEKDAYS",
  "WEEKLY",
  "MONTHLY",
  "CUSTOM",
] as const;
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number];

/**
 * Custom recurrence rule, serialised as JSON into `recurrenceRule`.
 * - weekdays: ISO-ish day numbers 0..6 (0 = Sunday) for CUSTOM/WEEKLY
 * - intervalDays: repeat every N days for CUSTOM
 */
export interface RecurrenceRule {
  weekdays?: number[];
  intervalDays?: number;
}

/**
 * The canonical task shape used by the UI, local database and sync layer.
 * Dates/times are wall clock strings (`YYYY-MM-DD`, `HH:mm`, 24h) so that a
 * "6:00 PM" reminder stays at 6:00 PM across DST/timezone changes.
 * Audit timestamps are epoch milliseconds (UTC).
 */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  status: Status;
  reminderEnabled: boolean;
  recurrenceType: RecurrenceType;
  recurrenceRule: RecurrenceRule | null;
  /** Incremented every time a recurring task rolls to its next occurrence. */
  occurrence: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  /** Tombstone marker; deleted rows are kept locally until synced. */
  deletedAt: number | null;
}

/** Local-only sync bookkeeping, never sent to the cloud as task data. */
export interface LocalTask extends Task {
  /** 1 when the row has local changes that still need to be pushed. */
  dirty: boolean;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority: Priority;
  reminderEnabled: boolean;
  recurrenceType: RecurrenceType;
  recurrenceRule?: RecurrenceRule | null;
}

export const PRIORITY_META: Record<
  Priority,
  { label: string; dot: string; chip: string; icon: string; rank: number; hex: string }
> = {
  HIGH: {
    label: "High",
    dot: "bg-[#FF5A5F]",
    chip: "bg-[#FFE8EA] text-[#E23B40] dark:bg-rose-500/15 dark:text-rose-300",
    icon: "!!",
    rank: 0,
    hex: "#FF5A5F",
  },
  MEDIUM: {
    label: "Medium",
    dot: "bg-[#F5B942]",
    chip: "bg-[#FFF4D6] text-[#C98912] dark:bg-amber-500/15 dark:text-amber-300",
    icon: "!",
    rank: 1,
    hex: "#F5B942",
  },
  LOW: {
    label: "Low",
    dot: "bg-[#2ECC71]",
    chip: "bg-[#E4F8EC] text-[#1FA85A] dark:bg-emerald-500/15 dark:text-emerald-300",
    icon: "~",
    rank: 2,
    hex: "#2ECC71",
  },
};

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  NEVER: "Never",
  DAILY: "Daily",
  WEEKDAYS: "Weekdays (Mon–Fri)",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};
