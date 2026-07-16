'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { verifyPassword } from '@/server/auth/password';
import { createSession, destroySession } from '@/server/auth/session';

export type LoginState = { ok: boolean; message: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

const GENERIC_ERROR = 'Invalid email or password.';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });
  if (!parsed.success) {
    await sleep(200);
    return { ok: false, message: GENERIC_ERROR };
  }

  const { email, password } = parsed.data;
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  const valid = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !user.isActive || !valid) {
    await sleep(200);
    return { ok: false, message: GENERIC_ERROR };
  }

  const h = headers();
  await createSession(user.id, {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: h.get('user-agent'),
  });

  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'login',
    entityType: 'session',
    entityLabel: user.email,
  });

  // Only allow internal admin destinations — never an open redirect.
  const next = parsed.data.next;
  redirect(next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin');
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect('/admin/login');
}
