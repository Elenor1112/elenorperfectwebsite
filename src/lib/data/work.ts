import 'server-only';
import { unstable_cache } from 'next/cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { caseStudies, rosterClients } from '@/db/schema';
import type { MetricItem, RichTextDoc, TestimonialData } from '@/db/schema';
import { isDraftMode } from './draft';

export type PublicCaseStudy = {
  slug: string;
  client: string;
  industry: string;
  services: string[];
  categories: string[];
  technologies: string[];
  result: string;
  description: RichTextDoc | null;
  metrics: MetricItem[];
  testimonial: TestimonialData;
  featured: boolean;
  status: string;
  coverImage: { url: string; alt: string } | null;
  seo: {
    title: string | null;
    description: string | null;
    ogImageUrl: string | null;
    canonicalUrl: string | null;
    noIndex: boolean;
    keywords: string[] | null;
  };
  updatedAt: string;
};

export type PublicGallery = {
  id: string;
  label: string;
  serviceSlug: string | null;
  images: { url: string; alt: string; caption: string }[];
};

export type PublicRosterClient = { name: string; industries: string[] };

type CaseStudyRow = typeof caseStudies.$inferSelect & {
  coverImage: { url: string; alt: string } | null;
  ogImage: { url: string } | null;
  galleries?: {
    id: string;
    label: string;
    serviceSlug: string | null;
    sortOrder: number;
    images: { sortOrder: number; media: { url: string; alt: string; caption: string } | null }[];
  }[];
};

function toPublic(row: CaseStudyRow): PublicCaseStudy {
  return {
    slug: row.slug,
    client: row.client,
    industry: row.industry,
    services: row.services,
    categories: row.categories,
    technologies: row.technologies,
    result: row.result,
    description: row.description ?? null,
    metrics: row.metrics,
    testimonial: row.testimonial ?? null,
    featured: row.featured,
    status: row.status,
    coverImage: row.coverImage ? { url: row.coverImage.url, alt: row.coverImage.alt } : null,
    seo: {
      title: row.seoTitle,
      description: row.seoDescription,
      ogImageUrl: row.ogImage?.url ?? null,
      canonicalUrl: row.canonicalUrl,
      noIndex: row.noIndex,
      keywords: row.seoKeywords,
    },
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toGalleries(row: CaseStudyRow): PublicGallery[] {
  return (row.galleries ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
      id: g.id,
      label: g.label,
      serviceSlug: g.serviceSlug,
      images: g.images
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .flatMap((i) =>
          i.media ? [{ url: i.media.url, alt: i.media.alt, caption: i.media.caption }] : [],
        ),
    }));
}

const LIST_RELATIONS = {
  coverImage: { columns: { url: true, alt: true } },
  ogImage: { columns: { url: true } },
} as const;

const DETAIL_RELATIONS = {
  ...LIST_RELATIONS,
  galleries: {
    with: { images: { with: { media: { columns: { url: true, alt: true, caption: true } } } } },
  },
} as const;

async function fetchCaseStudies(includeDrafts: boolean): Promise<PublicCaseStudy[]> {
  const rows = await db.query.caseStudies.findMany({
    where: includeDrafts ? undefined : eq(caseStudies.status, 'published'),
    orderBy: [asc(caseStudies.sortOrder)],
    with: LIST_RELATIONS as never,
  });
  return (rows as unknown as CaseStudyRow[]).map(toPublic);
}

async function fetchCaseStudy(
  slug: string,
  includeDrafts: boolean,
): Promise<{ caseStudy: PublicCaseStudy; galleries: PublicGallery[] } | null> {
  const row = await db.query.caseStudies.findFirst({
    where: eq(caseStudies.slug, slug),
    with: DETAIL_RELATIONS as never,
  });
  if (!row) return null;
  const typed = row as unknown as CaseStudyRow;
  const pub = toPublic(typed);
  if (!includeDrafts && pub.status !== 'published') return null;
  return { caseStudy: pub, galleries: toGalleries(typed) };
}

export async function getCaseStudies(): Promise<PublicCaseStudy[]> {
  if (isDraftMode()) return fetchCaseStudies(true);
  return unstable_cache(() => fetchCaseStudies(false), ['case-studies:list'], {
    tags: ['case-studies'],
  })();
}

export async function getCaseStudy(slug: string) {
  if (isDraftMode()) return fetchCaseStudy(slug, true);
  return unstable_cache(() => fetchCaseStudy(slug, false), ['case-study', slug], {
    tags: ['case-studies', `case-study:${slug}`],
  })();
}

export async function getRosterClients(): Promise<PublicRosterClient[]> {
  const fetch = async () => {
    const rows = await db.query.rosterClients.findMany({
      where: eq(rosterClients.isActive, true),
      orderBy: [asc(rosterClients.sortOrder)],
    });
    return rows.map((r) => ({ name: r.name, industries: r.industries }));
  };
  return unstable_cache(fetch, ['roster:list'], { tags: ['roster'] })();
}

export async function getCaseStudySlugs(): Promise<string[]> {
  try {
    const list = await getCaseStudies();
    return list.map((c) => c.slug);
  } catch {
    return [];
  }
}
