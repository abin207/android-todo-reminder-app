import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { devices, type DeviceRow } from "@/db/schema";

/**
 * Device identity instead of user accounts.
 *
 * Each device holds an opaque 32-byte secret. Only its SHA-256 hash is stored.
 * Every API handler resolves the device first and then scopes *all* queries by
 * `vaultId`, which is the row-level access rule for this app: a device can
 * only ever read or write rows belonging to its own vault.
 */

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePairingCode(): string {
  const bytes = randomBytes(8);
  const chars = [...bytes].map((b) => PAIRING_ALPHABET[b % PAIRING_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export function extractToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  const alt = request.headers.get("x-device-token");
  return alt?.trim() || null;
}

/** Resolves the calling device or throws AuthError. */
export async function requireDevice(request: Request): Promise<DeviceRow> {
  const token = extractToken(request);
  if (!token) throw new AuthError("Missing device token");

  const rows = await db
    .select()
    .from(devices)
    .where(and(eq(devices.tokenHash, hashToken(token)), isNull(devices.revokedAt)))
    .limit(1);

  const device = rows[0];
  if (!device) throw new AuthError("Unknown or revoked device");

  await db
    .update(devices)
    .set({ lastSeenAt: new Date() })
    .where(eq(devices.id, device.id));

  return device;
}

export function errorResponse(error: unknown, fallbackStatus = 500): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("[api]", message);
  return Response.json({ error: message }, { status: fallbackStatus });
}
