'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { testimonials } from '@/db/schema';
import { requireUser } from '@/server/auth/rbac';
import { revalidateTestimonials } from '@/lib/revalidate';
import { testimonialInputSchema, type TestimonialInput } from '@/lib/validation/content';
import type { ActionResult } from './services';

export async function saveTestimonial(input: TestimonialInput): Promise<ActionResult> {
  await requireUser('content:write');
  const parsed = testimonialInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { id, ...data } = parsed.data;
  if (id) {
    await db.update(testimonials).set({ ...data, updatedAt: new Date() }).where(eq(testimonials.id, id));
    revalidateTestimonials();
    return { ok: true, id };
  }
  const last = await db.query.testimonials.findMany({
    orderBy: (t, { desc }) => [desc(t.sortOrder)],
    limit: 1,
  });
  const [row] = await db
    .insert(testimonials)
    .values({ ...data, sortOrder: (last[0]?.sortOrder ?? -1) + 1 })
    .returning({ id: testimonials.id });
  revalidateTestimonials();
  return { ok: true, id: row.id };
}

export async function deleteTestimonial(id: string): Promise<{ ok: boolean }> {
  await requireUser('content:write');
  await db.delete(testimonials).where(eq(testimonials.id, z.string().uuid().parse(id)));
  revalidateTestimonials();
  return { ok: true };
}

export async function toggleTestimonial(id: string, isActive: boolean): Promise<{ ok: boolean }> {
  await requireUser('content:write');
  await db.update(testimonials).set({ isActive, updatedAt: new Date() }).where(eq(testimonials.id, id));
  revalidateTestimonials();
  return { ok: true };
}

export async function reorderTestimonials(ids: string[]): Promise<{ ok: boolean }> {
  await requireUser('content:write');
  const parsed = z.array(z.string().uuid()).parse(ids);
  await Promise.all(
    parsed.map((id, i) => db.update(testimonials).set({ sortOrder: i }).where(eq(testimonials.id, id))),
  );
  revalidateTestimonials();
  return { ok: true };
}
