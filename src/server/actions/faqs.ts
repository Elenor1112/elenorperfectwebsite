'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { faqCategories, faqs } from '@/db/schema';
import { requireUser } from '@/server/auth/rbac';
import { revalidateFaqs } from '@/lib/revalidate';
import { faqInputSchema, type FaqInput } from '@/lib/validation/content';
import type { ActionResult } from './services';

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export async function saveFaq(input: FaqInput): Promise<ActionResult> {
  await requireUser('content:write');
  const parsed = faqInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { id, ...data } = parsed.data;
  if (id) {
    await db.update(faqs).set({ ...data, updatedAt: new Date() }).where(eq(faqs.id, id));
    revalidateFaqs();
    return { ok: true, id };
  }
  const siblings = await db.query.faqs.findMany({
    where: data.categoryId ? eq(faqs.categoryId, data.categoryId) : undefined,
    orderBy: (f, { desc }) => [desc(f.sortOrder)],
    limit: 1,
  });
  const [row] = await db
    .insert(faqs)
    .values({ ...data, sortOrder: (siblings[0]?.sortOrder ?? -1) + 1 })
    .returning({ id: faqs.id });
  revalidateFaqs();
  return { ok: true, id: row.id };
}

export async function deleteFaq(id: string): Promise<{ ok: boolean }> {
  await requireUser('content:write');
  await db.delete(faqs).where(eq(faqs.id, z.string().uuid().parse(id)));
  revalidateFaqs();
  return { ok: true };
}

export async function toggleFaq(id: string, isActive: boolean): Promise<{ ok: boolean }> {
  await requireUser('content:write');
  await db.update(faqs).set({ isActive, updatedAt: new Date() }).where(eq(faqs.id, id));
  revalidateFaqs();
  return { ok: true };
}

export async function reorderFaqs(ids: string[]): Promise<{ ok: boolean }> {
  await requireUser('content:write');
  const parsed = z.array(z.string().uuid()).parse(ids);
  await Promise.all(parsed.map((id, i) => db.update(faqs).set({ sortOrder: i }).where(eq(faqs.id, id))));
  revalidateFaqs();
  return { ok: true };
}

export async function saveFaqCategory(name: string, id?: string): Promise<ActionResult> {
  await requireUser('content:write');
  const clean = z.string().min(1).max(120).parse(name.trim());
  if (id) {
    await db.update(faqCategories).set({ name: clean }).where(eq(faqCategories.id, id));
    revalidateFaqs();
    return { ok: true, id };
  }
  const [row] = await db
    .insert(faqCategories)
    .values({ slug: slugify(clean), name: clean })
    .onConflictDoNothing({ target: faqCategories.slug })
    .returning({ id: faqCategories.id });
  revalidateFaqs();
  return row ? { ok: true, id: row.id } : { ok: false, error: 'Category already exists' };
}

export async function deleteFaqCategory(id: string): Promise<{ ok: boolean }> {
  await requireUser('content:write');
  await db.delete(faqCategories).where(eq(faqCategories.id, z.string().uuid().parse(id)));
  revalidateFaqs();
  return { ok: true };
}
