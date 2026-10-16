import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { errorResponse, requireDevice } from "@/server/auth";
import type { PairedDevice } from "@/types/sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const current = await requireDevice(request);
    const rows = await db
      .select()
      .from(devices)
      .where(and(eq(devices.vaultId, current.vaultId), isNull(devices.revokedAt)));

    const payload: PairedDevice[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.getTime(),
      lastSeenAt: row.lastSeenAt.getTime(),
      isCurrent: row.id === current.id,
    }));

    return Response.json({ devices: payload });
  } catch (error) {
    return errorResponse(error);
  }
}
