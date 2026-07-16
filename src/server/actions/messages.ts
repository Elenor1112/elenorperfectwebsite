'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { contactMessages } from '@/db/schema';
import { requireUser } from '@/server/auth/rbac';

const statusSchema = z.enum(['new', 'read', 'replied', 'archived']);

export async function setMessageStatus(id: string, status: z.infer<typeof statusSchema>) {
  await requireUser('messages:write');
  await db
    .update(contactMessages)
    .set({ status: statusSchema.parse(status) })
    .where(eq(contactMessages.id, z.string().uuid().parse(id)));
  return { ok: true as const };
}

export async function saveMessageNote(id: string, note: string) {
  await requireUser('messages:write');
  await db
    .update(contactMessages)
    .set({ internalNote: z.string().max(5000).parse(note) })
    .where(eq(contactMessages.id, z.string().uuid().parse(id)));
  return { ok: true as const };
}

export async function deleteMessage(id: string) {
  await requireUser('messages:write');
  await db.delete(contactMessages).where(eq(contactMessages.id, z.string().uuid().parse(id)));
  return { ok: true as const };
}
