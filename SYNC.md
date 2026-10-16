# Synchronization, pairing & security

```
Local store (dirty rows)
        |  push
        v
  POST /api/sync  ──>  PostgreSQL (vault scoped)
        ^  pull (updatedAt > cursor)
        |
Local store (merge, last-write-wins)
```

## Identity instead of login

There is no email/password, no OAuth, no login screen.

1. On first launch the device calls `POST /api/devices/register`.
2. The server creates a **vault** (the private task collection) and a **device
   identity**: `{ deviceId, vaultId, token }`.
3. The device stores the token locally; the server stores only
   `sha256(token)`.
4. Every request sends `Authorization: Bearer <token>`. The server resolves the
   device, rejects revoked ones, and scopes **every** query by `vault_id`.

## Pairing a second device

```
Device A: Settings → Add device → Generate pairing code   →  7K4P-92XM
Device B: Settings → Enter pairing code → Pair device
```

- `POST /api/pairing/code` (authenticated) issues a single-use code that
  expires in 10 minutes.
- `POST /api/pairing/claim` validates it and mints a *new* device identity in
  the same vault. The code is marked claimed.
- Device B then resets its sync cursor to `0` and performs a full pull, so it
  receives the whole task collection, and schedules its own local
  notifications.
- Device removal (`DELETE /api/devices/:id`) revokes the token; a device
  cannot revoke itself.

## Delta protocol

Request: `{ since: <epoch ms cursor>, changes: Task[] }`
Response: `{ serverTime, changes: Task[], accepted: string[] }`

- Push: every locally `dirty` row (max 500 per round).
- Pull: all vault rows with `updated_at > since`.
- The new cursor is `max(updatedAt)` of received rows (not the server clock),
  which is robust against clock skew.
- `dirty` is cleared only for accepted rows that were not modified again while
  the request was in flight.

## Conflict strategy (documented, deterministic)

**Last-write-wins on `updatedAt` (epoch ms, UTC), whole-row.**

- Server side: the upsert applies an incoming row only when
  `incoming.updatedAt >= stored.updatedAt`. Otherwise the stored row wins and
  is returned in the same response, so the loser is corrected immediately.
- Client side: a remote row overwrites a local row only when
  `remote.updatedAt > local.updatedAt`.
- Ties keep the existing row (idempotent re-pushes are harmless).
- Deletes are tombstones (`deletedAt`), so a delete competes under the same
  rule instead of silently losing to a concurrent edit. Synced tombstones are
  purged locally after 30 days.

Nothing is overwritten without this rule, and no data is dropped because of a
temporary network failure: unsynced rows stay `dirty` and are retried on the
next sync (every 60 s, on `online`, on app foreground, and after every
mutation).

## Offline scenarios

| Scenario | Behaviour |
| --- | --- |
| Internet off, create "Exercise 18:00" | Saved locally, marked pending sync, notification scheduled immediately |
| Internet returns | Background sync pushes it; the card's "Pending sync" badge disappears |
| Device A creates, Device B syncs | Device B pulls the row and schedules its own local notification |
| Device B completes it | Tombstone-free status change propagates back to A on its next pull; A's reconciliation cancels the obsolete notification |

## Security notes

- Secrets live only in `.env` (git-ignored); `.env.example` holds placeholders.
- No service-role key exists in client code. On a Supabase deployment only the
  anon key may be public and RLS must be enabled (policy in `DATABASE.md`).
- Device tokens are 32 random bytes, transmitted over HTTPS, stored hashed.
- Authorization is enforced server-side on every route; the client never
  decides what it may read.
- Task payloads are validated and clamped server-side (`src/server/taskMapper.ts`).
- Logs contain ids and error messages only — never tokens or task contents.
