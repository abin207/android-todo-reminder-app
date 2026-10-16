import { getLocalStore } from "@/database/localStore";
import type { LocalTask, Task } from "@/types/task";
import type { SyncResponse, SyncStatus } from "@/types/sync";
import { apiFetch, ensureIdentity, readIdentity } from "./deviceService";
import { isOnline } from "@/utils/platform";

const CURSOR_KEY = "sync.cursor";
const LAST_SYNCED_KEY = "sync.lastSyncedAt";
/** Tombstones older than this are purged locally once synced. */
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function stripLocalFields(task: LocalTask): Task {
  const { dirty: _dirty, ...rest } = task;
  void _dirty;
  return rest;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const store = getLocalStore();
  const [lastSyncedRaw, rows] = await Promise.all([
    store.getMeta(LAST_SYNCED_KEY),
    store.allTasks(),
  ]);
  return {
    state: isOnline() ? "idle" : "offline",
    lastSyncedAt: lastSyncedRaw ? Number(lastSyncedRaw) : null,
    pendingCount: rows.filter((row) => row.dirty).length,
  };
}

/** Forces the next sync to pull the entire vault (used right after pairing). */
export async function resetSyncCursor(): Promise<void> {
  await getLocalStore().setMeta(CURSOR_KEY, "0");
}

/**
 * Push local dirty rows, pull remote changes, merge with last-write-wins on
 * `updatedAt`. Safe to call often; it is a no-op when offline.
 */
export async function syncNow(): Promise<SyncStatus> {
  const store = getLocalStore();

  if (!isOnline()) {
    const status = await getSyncStatus();
    return { ...status, state: "offline", message: "You are offline. Changes are queued." };
  }

  try {
    await ensureIdentity();
  } catch (error) {
    const status = await getSyncStatus();
    return {
      ...status,
      state: "error",
      message: error instanceof Error ? error.message : "Could not register device",
    };
  }

  const rows = await store.allTasks();
  const dirty = rows.filter((row) => row.dirty);
  const cursorRaw = await store.getMeta(CURSOR_KEY);
  const since = cursorRaw ? Number(cursorRaw) : 0;

  try {
    const response = await apiFetch<SyncResponse>("/api/sync", {
      method: "POST",
      body: JSON.stringify({ since, changes: dirty.map(stripLocalFields) }),
    });

    const byId = new Map(rows.map((row) => [row.id, row] as const));
    const writes: LocalTask[] = [];
    let cursor = since;

    for (const remote of response.changes) {
      cursor = Math.max(cursor, remote.updatedAt);
      const local = byId.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        writes.push({ ...remote, dirty: false });
      }
    }

    // Clear the dirty flag for rows the server accepted and that were not
    // modified again while the request was in flight.
    const acceptedSet = new Set(response.accepted);
    for (const row of dirty) {
      if (!acceptedSet.has(row.id)) continue;
      const fresh = await store.getTask(row.id);
      if (fresh && fresh.updatedAt === row.updatedAt) {
        writes.push({ ...fresh, dirty: false });
      }
    }

    await store.putTasks(writes);
    await store.setMeta(CURSOR_KEY, String(cursor));
    const now = Date.now();
    await store.setMeta(LAST_SYNCED_KEY, String(now));

    // Purge fully-synced old tombstones to keep the local DB small.
    const purgeable = (await store.allTasks()).filter(
      (row) => row.deletedAt && !row.dirty && now - row.deletedAt > TOMBSTONE_TTL_MS,
    );
    for (const row of purgeable) await store.removeTask(row.id);

    const pendingCount = (await store.allTasks()).filter((row) => row.dirty).length;
    return { state: "idle", lastSyncedAt: now, pendingCount };
  } catch (error) {
    const status = await getSyncStatus();
    const message = error instanceof Error ? error.message : "Sync failed";
    console.warn("[sync] failed:", message);
    return { ...status, state: "error", message };
  }
}

export function hasIdentity(): boolean {
  return readIdentity() !== null;
}
