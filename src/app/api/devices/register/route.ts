import { db } from "@/db";
import { devices, vaults } from "@/db/schema";
import { errorResponse, generateId, generateToken, hashToken } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * Creates a brand new private vault plus its first device identity.
 * No email, password or third-party login is involved.
 */
const SHARED_VAULT_ID = "default_shared_vault";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = (body.name ?? "").trim().slice(0, 60) || "My device";

    const deviceId = generateId("dev");
    const token = generateToken();

    // Ensure the shared vault exists
    await db
      .insert(vaults)
      .values({ id: SHARED_VAULT_ID })
      .onConflictDoNothing();

    // Attach every device to the shared vault
    await db.insert(devices).values({
      id: deviceId,
      vaultId: SHARED_VAULT_ID,
      name,
      tokenHash: hashToken(token),
    });

    return Response.json({ deviceId, vaultId: SHARED_VAULT_ID, token, name }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
