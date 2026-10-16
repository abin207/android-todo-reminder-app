import { db } from "@/db";
import { pairingCodes } from "@/db/schema";
import { errorResponse, generatePairingCode, requireDevice } from "@/server/auth";

export const dynamic = "force-dynamic";

const CODE_TTL_MS = 10 * 60 * 1000;

/** Issues a short-lived pairing code for the caller's vault. */
export async function POST(request: Request): Promise<Response> {
  try {
    const device = await requireDevice(request);
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await db.insert(pairingCodes).values({
      code,
      vaultId: device.vaultId,
      expiresAt,
    });

    return Response.json({ code, expiresAt: expiresAt.getTime() }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
