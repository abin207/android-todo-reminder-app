import { eq } from "drizzle-orm";
import { db } from "@/db";
import { devices, pairingCodes } from "@/db/schema";
import { errorResponse, generateId, generateToken, hashToken } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * Claims a pairing code and creates a second device identity inside the same
 * vault. Codes are single use and expire after 10 minutes.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      code?: string;
      name?: string;
    };
    const code = (body.code ?? "").trim().toUpperCase();
    const name = (body.name ?? "").trim().slice(0, 60) || "Paired device";

    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return Response.json({ error: "Pairing code format is invalid." }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(pairingCodes)
      .where(eq(pairingCodes.code, code))
      .limit(1);
    const pairing = rows[0];

    if (!pairing) {
      return Response.json({ error: "Pairing code not found." }, { status: 404 });
    }
    if (pairing.claimedAt) {
      return Response.json({ error: "Pairing code was already used." }, { status: 409 });
    }
    if (pairing.expiresAt.getTime() < Date.now()) {
      return Response.json({ error: "Pairing code has expired." }, { status: 410 });
    }

    const deviceId = generateId("dev");
    const token = generateToken();

    await db.insert(devices).values({
      id: deviceId,
      vaultId: pairing.vaultId,
      name,
      tokenHash: hashToken(token),
    });
    await db
      .update(pairingCodes)
      .set({ claimedAt: new Date(), claimedByDeviceId: deviceId })
      .where(eq(pairingCodes.code, code));

    return Response.json(
      { deviceId, vaultId: pairing.vaultId, token, name },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
