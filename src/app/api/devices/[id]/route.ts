import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { errorResponse, requireDevice } from "@/server/auth";

export const dynamic = "force-dynamic";

/** Revokes another device in the same vault (cannot revoke itself). */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const current = await requireDevice(request);
    const { id } = await context.params;

    if (id === current.id) {
      return Response.json(
        { error: "A device cannot remove itself. Use another paired device." },
        { status: 400 },
      );
    }

    const result = await db
      .update(devices)
      .set({ revokedAt: new Date() })
      .where(and(eq(devices.id, id), eq(devices.vaultId, current.vaultId)))
      .returning({ id: devices.id });

    if (!result.length) {
      return Response.json({ error: "Device not found in this vault." }, { status: 404 });
    }

    return Response.json({ removed: id });
  } catch (error) {
    return errorResponse(error);
  }
}
