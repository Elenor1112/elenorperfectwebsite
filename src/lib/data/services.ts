import 'server-only';
import { cachedQuery } from './cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { services } from '@/db/schema';
import type { FaqItem, RichTextDoc } from '@/db/schema';
import { isDraftMode } from './draft';

export type PublicService = {
  slug: string;
  title: string;
  name: string;
  short: string;
  metaDescription: string;
  lede: string;
  body: RichTextDoc | null;
  included: string[];
  process: string[];
  proof: string[];
  faq: FaqItem[];
  accent: 'brand' | 'cyan' | 'amber';
  icon: string | null;
  status: string;
  featuredImage: { url: string; alt: string } | null;
  gallery: { url: string; alt: string; caption: string }[];
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

type ServiceRow = typeof services.$inferSelect & {
  featuredImage: { url: string; alt: string } | null;
  ogImage: { url: string } | null;
  gallery: { sortOrder: number; media: { url: string; alt: string; caption: string } | null }[];
};

function toPublic(row: ServiceRow): PublicService {
  return {
    slug: row.slug,
    title: row.title,
    name: row.name,
    short: row.short,
    metaDescription: row.metaDescription,
    lede: row.lede,
    body: row.body ?? null,
    included: row.included,
    process: row.process,
    proof: row.proof,
    faq: row.faqs,
    accent: row.accent,
    icon: row.icon,
    status: row.status,
    featuredImage: row.featuredImage
      ? { url: row.featuredImage.url, alt: row.featuredImage.alt }
      : null,
    gallery: row.gallery
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((g) => (g.media ? [{ url: g.media.url, alt: g.media.alt, caption: g.media.caption }] : [])),
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

const RELATIONS = {
  featuredImage: { columns: { url: true, alt: true } },
  ogImage: { columns: { url: true } },
  gallery: { with: { media: { columns: { url: true, alt: true, caption: true } } } },
} as const;

async function fetchServices(includeDrafts: boolean): Promise<PublicService[]> {
  const rows = await db.query.services.findMany({
    where: includeDrafts ? undefined : eq(services.status, 'published'),
    orderBy: [asc(services.sortOrder)],
    with: RELATIONS as never,
  });
  return (rows as unknown as ServiceRow[]).map(toPublic);
}

async function fetchService(slug: string, includeDrafts: boolean): Promise<PublicService | null> {
  const row = await db.query.services.findFirst({
    where: eq(services.slug, slug),
    with: RELATIONS as never,
  });
  if (!row) return null;
  const pub = toPublic(row as unknown as ServiceRow);
  if (!includeDrafts && pub.status !== 'published') return null;
  return pub;
}

export async function getServices(): Promise<PublicService[]> {
  if (isDraftMode()) return fetchServices(true);
  return cachedQuery(() => fetchServices(false), ['services:list'], { tags: ['services'] });
}

export async function getService(slug: string): Promise<PublicService | null> {
  if (isDraftMode()) return fetchService(slug, true);
  return cachedQuery(() => fetchService(slug, false), ['service', slug], {
    tags: ['services', `service:${slug}`],
  });
}

/** For generateStaticParams — returns [] when the DB is unreachable at build
 *  time so the build survives and slugs render on-demand instead. */
export async function getServiceSlugs(): Promise<string[]> {
  try {
    const list = await getServices();
    return list.map((s) => s.slug);
  } catch {
    return [];
  }
}
