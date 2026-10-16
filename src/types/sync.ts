import type { Task } from "./task";

export interface DeviceIdentity {
  deviceId: string;
  vaultId: string;
  token: string;
  name: string;
}

export interface SyncRequest {
  since: number;
  changes: Task[];
}

export interface SyncResponse {
  serverTime: number;
  changes: Task[];
  /** Ids the server accepted (safe to clear the local dirty flag for). */
  accepted: string[];
}

export type SyncState = "idle" | "syncing" | "offline" | "error";

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null;
  pendingCount: number;
  message?: string;
}

export interface PairedDevice {
  id: string;
  name: string;
  createdAt: number;
  lastSeenAt: number;
  isCurrent: boolean;
}
