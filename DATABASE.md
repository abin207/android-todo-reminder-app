# Database

## Canonical task model (`src/types/task.ts`)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string (uuid) | generated on the device |
| `title` | string | required, ≤ 200 chars |
| `description` | string \| null | optional |
| `dueDate` | `YYYY-MM-DD` \| null | wall-clock local date |
| `dueTime` | `HH:mm` (24h) \| null | wall-clock local time |
| `priority` | `LOW` \| `MEDIUM` \| `HIGH` | |
| `status` | `PENDING` \| `COMPLETED` | |
| `reminderEnabled` | boolean | |
| `recurrenceType` | `NEVER`/`DAILY`/`WEEKDAYS`/`WEEKLY`/`MONTHLY`/`CUSTOM` | |
| `recurrenceRule` | `{ weekdays?: number[]; intervalDays?: number }` \| null | JSON in storage |
| `occurrence` | integer | increments per recurring occurrence; part of the notification id |
| `createdAt` / `updatedAt` | epoch ms (UTC) | `updatedAt` drives conflict resolution |
| `completedAt` | epoch ms \| null | |
| `deletedAt` | epoch ms \| null | tombstone |
| `dirty` *(local only)* | boolean | pending push to the cloud |

### Why wall-clock date/time?

A reminder means "18:00 local", not "16:00 UTC". Storing wall-clock values and
resolving them to an instant lazily (`toEpoch` in `src/utils/datetime.ts`)
keeps reminders correct across DST transitions, travel and device timezone
changes. Audit timestamps stay absolute (epoch ms) because they must be
comparable across devices.

## Local database

`LocalStore` (`src/database/localStore.ts`) is the port:

```ts
init() · allTasks() · getTask(id) · putTask(t) · putTasks(ts) · removeTask(id)
getMeta(key) · setMeta(key, value)
```

Implementations:

- **IndexedDB** (`todo-local`, stores `tasks` + `meta`) — browser/PWA/dev.
- **Capacitor SQLite** (`src/database/sqliteAdapter.ts`) — Android. Tables:
  `tasks(id TEXT PK, payload TEXT, updated_at INTEGER, dirty INTEGER)` and
  `meta(key TEXT PK, value TEXT)`. Loaded lazily so the web bundle never
  resolves the native plugin.
- **Memory** — SSR + unit tests (`createMemoryStore()`).

Meta keys: `settings`, `sync.cursor`, `sync.lastSyncedAt`.

## Cloud database (PostgreSQL via Drizzle, `src/db/schema.ts`)

- `vaults(id, created_at)` — one private task collection.
- `devices(id, vault_id, name, token_hash, created_at, last_seen_at, revoked_at)`
  — device identities; only SHA-256 hashes of tokens are stored.
- `pairing_codes(code, vault_id, created_at, expires_at, claimed_at, claimed_by_device_id)`
  — single-use, 10 minute TTL.
- `tasks(id, vault_id, …task fields…, occurrence, created_at, updated_at,
  completed_at, deleted_at, updated_by_device_id)` with an index on
  `(vault_id, updated_at)` for delta pulls.

Apply schema changes with:

```bash
npx drizzle-kit push
```

## Access control

Every query is scoped by `vault_id` resolved from the caller's device token
(`src/server/auth.ts`). That is the row-level rule of this deployment: a device
can only read/write rows in its own vault. On a Supabase deployment the same
rule is expressed as an RLS policy:

```sql
alter table tasks enable row level security;
create policy "tasks are vault scoped" on tasks
  using (vault_id = current_setting('request.jwt.claims', true)::json->>'vault_id');
```
