import type { DeviceIdentity, PairedDevice } from "@/types/sync";
import { platformName } from "@/utils/platform";

const IDENTITY_KEY = "todo.device.identity";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function readIdentity(): DeviceIdentity | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceIdentity;
    return parsed?.token && parsed.deviceId ? parsed : null;
  } catch {
    return null;
  }
}

function writeIdentity(identity: DeviceIdentity): DeviceIdentity {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

export function clearIdentity(): void {
  if (typeof localStorage !== "undefined") localStorage.removeItem(IDENTITY_KEY);
}

function defaultDeviceName(): string {
  const platform = platformName();
  if (typeof navigator === "undefined") return `Device (${platform})`;
  const ua = navigator.userAgent;
  const guess = /android/i.test(ua)
    ? "Android device"
    : /iphone|ipad/i.test(ua)
      ? "iOS device"
      : /mac/i.test(ua)
        ? "Mac"
        : /windows/i.test(ua)
          ? "Windows PC"
          : "Browser";
  return `${guess} (${platform})`;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");
  if (options.auth !== false) {
    const identity = readIdentity();
    if (!identity) throw new ApiError("This device is not registered yet.", 401);
    headers.set("authorization", `Bearer ${identity.token}`);
  }

  const response = await fetch(path, { ...options, headers });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "Request failed",
      response.status,
    );
  }
  return payload as T;
}

/** Registers this device (creating a fresh private vault) if needed. */
export async function ensureIdentity(): Promise<DeviceIdentity> {
  const existing = readIdentity();
  if (existing) return existing;

  const name = defaultDeviceName();
  const result = await apiFetch<DeviceIdentity>("/api/devices/register", {
    method: "POST",
    body: JSON.stringify({ name }),
    auth: false,
  });
  return writeIdentity({ ...result, name });
}

export async function createPairingCode(): Promise<{ code: string; expiresAt: number }> {
  return apiFetch<{ code: string; expiresAt: number }>("/api/pairing/code", {
    method: "POST",
  });
}

/** Joins an existing vault; the caller must then run a full re-sync. */
export async function pairWithCode(code: string): Promise<DeviceIdentity> {
  const name = defaultDeviceName();
  const result = await apiFetch<DeviceIdentity>("/api/pairing/claim", {
    method: "POST",
    body: JSON.stringify({ code: code.trim().toUpperCase(), name }),
    auth: false,
  });
  return writeIdentity({ ...result, name });
}

export async function listDevices(): Promise<PairedDevice[]> {
  const result = await apiFetch<{ devices: PairedDevice[] }>("/api/devices");
  return result.devices;
}

export async function removeDevice(id: string): Promise<void> {
  await apiFetch(`/api/devices/${id}`, { method: "DELETE" });
}

export { apiFetch };
