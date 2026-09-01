import 'server-only';
import { cachedQuery } from './cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pages, pageSections } from '@/db/schema';
import {
  parseSectionData,
  type SectionData,
  type SectionType,
} from '@/lib/validation/sections';
import { isDraftMode } from './draft';

export type PublicPage = {
  slug: string;
  title: string;
  seo: {
    title: string | null;
    description: string | null;
    ogImageUrl: string | null;
    canonicalUrl: string | null;
    noIndex: boolean;
    keywords: string[] | null;
  };
  sections: { id: string; type: string; data: unknown; isEnabled: boolean }[];
};

async function fetchPage(slug: string, includeDisabled: boolean): Promise<PublicPage | null> {
  const row = await db.query.pages.findFirst({
    where: eq(pages.slug, slug),
    with: {
      ogImage: { columns: { url: true } },
      sections: { orderBy: [asc(pageSections.sortOrder)] },
    } as never,
  });
  if (!row) return null;
  type Row = typeof pages.$inferSelect & {
    ogImage: { url: string } | null;
    sections: (typeof pageSections.$inferSelect)[];
  };
  const typed = row as unknown as Row;
  return {
    slug: typed.slug,
    title: typed.title,
    seo: {
      title: typed.seoTitle,
      description: typed.seoDescription,
      ogImageUrl: typed.ogImage?.url ?? null,
      canonicalUrl: typed.canonicalUrl,
      noIndex: typed.noIndex,
      keywords: typed.seoKeywords,
    },
    sections: typed.sections
      .filter((s) => includeDisabled || s.isEnabled)
      .map((s) => ({ id: s.id, type: s.type, data: s.data, isEnabled: s.isEnabled })),
  };
}

export async function getPage(slug: string): Promise<PublicPage | null> {
  if (isDraftMode()) return fetchPage(slug, false);
  return cachedQuery(() => fetchPage(slug, false), ['page', slug], {
    tags: ['pages', `page:${slug}`],
  });
}

/** Typed accessor for one section of a page (defaults applied when absent). */
export function getSection<T extends SectionType>(
  page: PublicPage | null,
  type: T,
): { data: SectionData<T>; enabled: boolean } {
  const section = page?.sections.find((s) => s.type === type);
  return {
    data: parseSectionData(type, section?.data),
    enabled: section ? section.isEnabled : true,
  };
}
