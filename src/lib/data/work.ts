import 'server-only';
import { unstable_cache } from 'next/cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { caseStudies, caseStudyGalleries, rosterClients } from '@/db/schema';
import type { MetricItem, RichTextDoc, TestimonialData } from '@/db/schema';
import { isDraftMode } from './draft';

export type PublicCaseStudy = {
  slug: string;
  client: string;
  industry: string;
  industries: string[];
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
  videoUrls: string[];
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
    videoUrls: string[];
    images: { sortOrder: number; media: { url: string; alt: string; caption: string } | null }[];
  }[];
};

function toPublic(row: CaseStudyRow): PublicCaseStudy {
  return {
    slug: row.slug,
    client: row.client,
    industry: row.industry,
    // Older rows predate the column; fall back to the primary industry.
    industries: row.industries?.length > 0 ? row.industries : [row.industry].filter(Boolean),
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
      videoUrls: g.videoUrls ?? [],
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

/* --------------------- per-service showcase (hero slider) ------------------- */

export type ServiceShowcaseImage = { url: string; alt: string; client: string };

const SHOWCASE_LIMIT = 10;

// All gallery images across *published* case studies whose gallery is tagged
// with this service — e.g. /services/brand-identity shows real brand-identity
// work. Interleaved round-robin across clients so the slider varies instead
// of dumping one client's whole gallery first.
async function fetchServiceShowcaseImages(serviceSlug: string): Promise<ServiceShowcaseImage[]> {
  const galleries = await db.query.caseStudyGalleries.findMany({
    where: eq(caseStudyGalleries.serviceSlug, serviceSlug),
    with: {
      caseStudy: { columns: { client: true, status: true } },
      images: {
        with: { media: { columns: { url: true, alt: true } } },
      },
    } as never,
  });

  type GalleryRow = {
    caseStudy: { client: string; status: string } | null;
    images: { sortOrder: number; media: { url: string; alt: string } | null }[];
  };

  const perClient = (galleries as unknown as GalleryRow[])
    .filter((g) => g.caseStudy?.status === 'published')
    .map((g) =>
      g.images
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .flatMap((i) =>
          i.media ? [{ url: i.media.url, alt: i.media.alt, client: g.caseStudy!.client }] : [],
        ),
    )
    .filter((list) => list.length > 0);

  const out: ServiceShowcaseImage[] = [];
  for (let i = 0; out.length < SHOWCASE_LIMIT; i++) {
    let added = false;
    for (const list of perClient) {
      if (list[i]) {
        out.push(list[i]);
        added = true;
        if (out.length >= SHOWCASE_LIMIT) break;
      }
    }
    if (!added) break;
  }
  return out;
}

export function getServiceShowcaseImages(serviceSlug: string): Promise<ServiceShowcaseImage[]> {
  return unstable_cache(
    () => fetchServiceShowcaseImages(serviceSlug),
    ['service-showcase', serviceSlug],
    { tags: ['case-studies'] },
  )();
}

/* --------------------- per-service showcase video (hero) -------------------- */

export type ServiceShowcaseVideo = { url: string; client: string };

// A single hero video for a service page — the first video URL attached to a
// *published* case-study gallery tagged with this service. When several
// clients have a video for the same service we surface just one (Coca-Cola
// preferred), so the hero shows one clean player rather than a reel.
async function fetchServiceShowcaseVideo(serviceSlug: string): Promise<ServiceShowcaseVideo | null> {
  const galleries = await db.query.caseStudyGalleries.findMany({
    where: eq(caseStudyGalleries.serviceSlug, serviceSlug),
    with: {
      caseStudy: { columns: { client: true, status: true } },
    } as never,
  });

  type GalleryRow = {
    videoUrls: string[] | null;
    caseStudy: { client: string; status: string } | null;
  };

  const withVideo = (galleries as unknown as GalleryRow[])
    .filter((g) => g.caseStudy?.status === 'published' && (g.videoUrls?.length ?? 0) > 0)
    .map((g) => ({ url: g.videoUrls![0], client: g.caseStudy!.client }));

  if (withVideo.length === 0) return null;
  // Prefer Coca-Cola's video when multiple clients have one for this service.
  const preferred = withVideo.find((v) => /coca-?cola/i.test(v.client));
  return preferred ?? withVideo[0];
}

export function getServiceShowcaseVideo(serviceSlug: string): Promise<ServiceShowcaseVideo | null> {
  return unstable_cache(
    () => fetchServiceShowcaseVideo(serviceSlug),
    ['service-showcase-video', serviceSlug],
    { tags: ['case-studies'] },
  )();
}
