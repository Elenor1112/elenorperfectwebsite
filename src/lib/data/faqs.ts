import 'server-only';
import { unstable_cache } from 'next/cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { faqs } from '@/db/schema';

export type PublicFaq = { q: string; a: string };
export type PublicFaqCategory = {
  slug: string;
  name: string;
  faqs: PublicFaq[];
};

async function fetchFaqCategories(): Promise<PublicFaqCategory[]> {
  const cats = await db.query.faqCategories.findMany({
    orderBy: (c, { asc: a }) => [a(c.sortOrder)],
    with: {
      faqs: {
        where: eq(faqs.isActive, true),
        orderBy: [asc(faqs.sortOrder)],
        columns: { question: true, answer: true },
      },
    },
  });
  return cats.map((c) => ({
    slug: c.slug,
    name: c.name,
    faqs: c.faqs.map((f) => ({ q: f.question, a: f.answer })),
  }));
}

export function getFaqCategories(): Promise<PublicFaqCategory[]> {
  return unstable_cache(fetchFaqCategories, ['faqs:categories'], { tags: ['faqs'] })();
}

export async function getFaqsByCategory(slug: string): Promise<PublicFaq[]> {
  const cats = await getFaqCategories();
  return cats.find((c) => c.slug === slug)?.faqs ?? [];
}
