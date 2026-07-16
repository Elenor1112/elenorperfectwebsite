import 'server-only';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';

/** Fire-and-forget audit trail; failures never block the mutation. */
export async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  entityLabel: string,
  snapshot?: unknown,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId,
      entityLabel,
      snapshot: snapshot === undefined ? null : JSON.stringify(snapshot).slice(0, 100_000),
    });
  } catch {
    // best-effort only
  }
}
