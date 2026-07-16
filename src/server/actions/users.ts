'use server';

import { asc, count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireUser } from '@/server/auth/rbac';
import { hashPassword } from '@/server/auth/password';
import { revokeUserSessions } from '@/server/auth/session';
import { logAudit } from './audit';

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'EDITOR';
  isActive: boolean;
  createdAt: string;
};

export async function listUsers(): Promise<AdminUser[]> {
  await requireUser('users:write');
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));
}

const userSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().trim().toLowerCase().email(),
  name: z.string().min(1).max(200),
  role: z.enum(['SUPER_ADMIN', 'EDITOR']),
  isActive: z.boolean().default(true),
  password: z.string().min(8).max(200).optional().or(z.literal('')),
});

async function superAdminCount(): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(users)
    .where(eq(users.role, 'SUPER_ADMIN'));
  return Number(rows[0]?.n ?? 0);
}

export async function saveUser(input: z.input<typeof userSchema>) {
  const actor = await requireUser('users:write');
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { id, password, ...data } = parsed.data;

  if (id) {
    const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existing) return { ok: false as const, error: 'User not found' };

    // Never orphan the system: keep at least one active SUPER_ADMIN.
    const losingSuperAdmin =
      existing.role === 'SUPER_ADMIN' && (data.role !== 'SUPER_ADMIN' || !data.isActive);
    if (losingSuperAdmin && (await superAdminCount()) <= 1) {
      return { ok: false as const, error: 'There must always be at least one active Super Admin.' };
    }

    const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (password) update.passwordHash = await hashPassword(password);
    await db.update(users).set(update).where(eq(users.id, id));
    if (password || !data.isActive) await revokeUserSessions(id);
    await logAudit(actor.id, 'update', 'user', id, data.email);
    return { ok: true as const, id };
  }

  if (!password) return { ok: false as const, error: 'A password is required for new users.' };
  const dupe = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (dupe) return { ok: false as const, error: 'A user with this email already exists.' };

  const [row] = await db
    .insert(users)
    .values({ ...data, passwordHash: await hashPassword(password) })
    .returning({ id: users.id });
  await logAudit(actor.id, 'create', 'user', row.id, data.email);
  return { ok: true as const, id: row.id };
}

export async function deleteUser(id: string) {
  const actor = await requireUser('users:write');
  if (actor.id === id) return { ok: false as const, error: 'You cannot delete your own account.' };
  const existing = await db.query.users.findFirst({ where: eq(users.id, z.string().uuid().parse(id)) });
  if (!existing) return { ok: false as const, error: 'User not found' };
  if (existing.role === 'SUPER_ADMIN' && (await superAdminCount()) <= 1) {
    return { ok: false as const, error: 'There must always be at least one Super Admin.' };
  }
  await db.delete(users).where(eq(users.id, id));
  await logAudit(actor.id, 'delete', 'user', id, existing.email);
  return { ok: true as const };
}

export async function signOutUserEverywhere(id: string) {
  const actor = await requireUser('users:write');
  await revokeUserSessions(z.string().uuid().parse(id));
  await logAudit(actor.id, 'update', 'user_sessions', id, 'revoked all sessions');
  return { ok: true as const };
}
