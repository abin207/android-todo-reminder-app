import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { errorResponse, requireDevice } from "@/server/auth";
import { parseIncomingTask, rowToTask } from "@/server/taskMapper";
import { serializeRule } from "@/services/recurrenceService";
import type { SyncResponse } from "@/types/sync";

export const dynamic = "force-dynamic";

const MAX_CHANGES = 500;

/**
 * Bi-directional delta sync.
 *
 * Conflict strategy: deterministic last-write-wins on `updatedAt`
 * (milliseconds, UTC). An incoming row is applied only when its `updatedAt`
 * is greater than or equal to the stored one; otherwise the server copy wins
 * and is returned to the client in the same response. Deletes are tombstones
 * (`deletedAt`), so they participate in the same rule instead of vanishing.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const device = await requireDevice(request);
    const body = (await request.json().catch(() => ({}))) as {
      since?: number;
      changes?: unknown[];
    };

    const since = typeof body.since === "number" && body.since >= 0 ? body.since : 0;
    const incoming = Array.isArray(body.changes) ? body.changes.slice(0, MAX_CHANGES) : [];

    const accepted: string[] = [];

    for (const raw of incoming) {
      const task = parseIncomingTask(raw);
      if (!task) continue;

      const values = {
        id: task.id,
        vaultId: device.vaultId,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        priority: task.priority,
        status: task.status,
        reminderEnabled: task.reminderEnabled,
        recurrenceType: task.recurrenceType,
        recurrenceRule: serializeRule(task.recurrenceRule),
        occurrence: task.occurrence,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
        updatedByDeviceId: device.id,
      };

      await db
        .insert(tasks)
        .values(values)
        .onConflictDoUpdate({
          target: tasks.id,
          set: {
            title: values.title,
            description: values.description,
            dueDate: values.dueDate,
            dueTime: values.dueTime,
            priority: values.priority,
            status: values.status,
            reminderEnabled: values.reminderEnabled,
            recurrenceType: values.recurrenceType,
            recurrenceRule: values.recurrenceRule,
            occurrence: values.occurrence,
            updatedAt: values.updatedAt,
            completedAt: values.completedAt,
            deletedAt: values.deletedAt,
            updatedByDeviceId: values.updatedByDeviceId,
          },
          where: and(
            eq(tasks.vaultId, device.vaultId),
            sql`${tasks.updatedAt} <= ${values.updatedAt}`,
          ),
        });

      accepted.push(task.id);
    }

    const serverRows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.vaultId, device.vaultId), gt(tasks.updatedAt, new Date(since))));

    const payload: SyncResponse = {
      serverTime: Date.now(),
      changes: serverRows.map(rowToTask),
      accepted,
    };

    return Response.json(payload);
  } catch (error) {
    return errorResponse(error);
  }
}
