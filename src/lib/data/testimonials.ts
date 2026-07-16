import 'server-only';
import { unstable_cache } from 'next/cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { testimonials } from '@/db/schema';

export type PublicTestimonial = {
  quote: string;
  author: string;
  role: string;
  company: string;
};

async function fetchTestimonials(): Promise<PublicTestimonial[]> {
  const rows = await db.query.testimonials.findMany({
    where: eq(testimonials.isActive, true),
    orderBy: [asc(testimonials.sortOrder)],
  });
  return rows.map((t) => ({
    quote: t.quote,
    author: t.author,
    role: t.role,
    company: t.company,
  }));
}

export function getTestimonials(): Promise<PublicTestimonial[]> {
  return unstable_cache(fetchTestimonials, ['testimonials:list'], {
    tags: ['testimonials'],
  })();
}
