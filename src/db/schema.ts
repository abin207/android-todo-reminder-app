import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * A "vault" is one private task collection. It replaces traditional user
 * accounts: a vault is created implicitly by the first device and other
 * devices join it through a short-lived pairing code.
 */
export const vaults = pgTable("vaults", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Devices are the only identities in the system. Each device holds a secret
 * token; only its SHA-256 hash is persisted server side. All data access is
 * scoped by the vault the device belongs to (row level access control is
 * enforced in the API layer + by unique vault scoping of every query).
 */
export const devices = pgTable(
  "devices",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id")
      .notNull()
      .references(() => vaults.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("devices_token_hash_idx").on(table.tokenHash),
    index("devices_vault_idx").on(table.vaultId),
  ],
);

/** Short lived pairing codes used to attach a second device to a vault. */
export const pairingCodes = pgTable(
  "pairing_codes",
  {
    code: text("code").primaryKey(),
    vaultId: text("vault_id")
      .notNull()
      .references(() => vaults.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimedByDeviceId: text("claimed_by_device_id"),
  },
  (table) => [index("pairing_codes_vault_idx").on(table.vaultId)],
);

/**
 * Cloud mirror of the local-first task table. `dueDate`/`dueTime` are stored as
 * wall-clock values (YYYY-MM-DD / HH:mm) so reminders stay correct across
 * timezone and DST changes; `updatedAt` drives last-write-wins conflict
 * resolution and `deletedAt` implements tombstones for deletes.
 */
export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    vaultId: text("vault_id")
      .notNull()
      .references(() => vaults.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: text("due_date"),
    dueTime: text("due_time"),
    priority: text("priority").notNull().default("MEDIUM"),
    status: text("status").notNull().default("PENDING"),
    reminderEnabled: boolean("reminder_enabled").notNull().default(true),
    recurrenceType: text("recurrence_type").notNull().default("NEVER"),
    recurrenceRule: text("recurrence_rule"),
    occurrence: integer("occurrence").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    updatedByDeviceId: text("updated_by_device_id"),
  },
  (table) => [
    index("tasks_vault_updated_idx").on(table.vaultId, table.updatedAt),
  ],
);

export type DeviceRow = typeof devices.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
