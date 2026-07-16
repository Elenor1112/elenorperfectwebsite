import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';

export const SESSION_COOKIE = 'admin_session';

const SESSION_DAYS = 30;
const RENEW_UNDER_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'EDITOR';
};

/** Creates a DB session and sets the cookie. Call only from a Server Action
 *  or Route Handler (cookie writes are not allowed during RSC render). */
export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/** Validates the session cookie against the DB. Safe to call during render.
 *  Extends the DB-side expiry (sliding window) but never touches the cookie. */
export async function validateSession(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const id = hashToken(token);
  const rows = await db
    .select({
      sessionExpiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);

  const row = rows[0];
  if (!row || !row.isActive) return null;

  const now = Date.now();
  if (row.sessionExpiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  if (row.sessionExpiresAt.getTime() - now < RENEW_UNDER_DAYS * DAY_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(now + SESSION_DAYS * DAY_MS) })
      .where(eq(sessions.id, id));
  }

  return { id: row.userId, email: row.email, name: row.name, role: row.role };
}

/** Deletes the current session row and clears the cookie (Server Action /
 *  Route Handler only). */
export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  cookies().delete(SESSION_COOKIE);
}

/** Revokes every session of a user (e.g. deactivation, password change). */
export async function revokeUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
