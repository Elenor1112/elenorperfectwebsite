import 'server-only';
import { unstable_cache } from 'next/cache';
import { and, desc, eq, lte, or, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { posts } from '@/db/schema';
import type { RichTextDoc } from '@/db/schema';
import { isDraftMode } from './draft';

// Blog caches use a 300s time fallback in addition to tags so that a
// *scheduled* post whose publish time passes goes live within 5 minutes with
// no cron and no manual action (the where-clause below treats due scheduled
// posts as published).
const BLOG_REVALIDATE_SECONDS = 300;

export type PublicPost = {
  slug: string;
  title: string;
  dek: string;
  body: RichTextDoc;
  date: string; // ISO — publishedAt (falls back to createdAt for drafts)
  readMinutes: number;
  author: { name: string; title: string };
  category: string;
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

type PostRow = typeof posts.$inferSelect & {
  coverImage: { url: string; alt: string } | null;
  ogImage: { url: string } | null;
  category: { name: string; slug: string } | null;
};

function toPublic(row: PostRow): PublicPost {
  return {
    slug: row.slug,
    title: row.title,
    dek: row.excerpt,
    body: row.body,
    date: (row.publishedAt ?? row.createdAt).toISOString(),
    readMinutes: row.readingMinutes,
    author: { name: row.authorName, title: row.authorTitle },
    category: row.category?.name ?? '',
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

/** Published, or scheduled with a publish time that has already passed. */
function liveWhere(): SQL | undefined {
  return or(
    eq(posts.status, 'published'),
    and(eq(posts.status, 'scheduled'), lte(posts.publishedAt, new Date())),
  );
}

const RELATIONS = {
  coverImage: { columns: { url: true, alt: true } },
  ogImage: { columns: { url: true } },
  category: { columns: { name: true, slug: true } },
} as const;

async function fetchPosts(includeDrafts: boolean): Promise<PublicPost[]> {
  const rows = await db.query.posts.findMany({
    where: includeDrafts ? undefined : liveWhere(),
    orderBy: [desc(posts.publishedAt), desc(posts.createdAt)],
    with: RELATIONS as never,
  });
  return (rows as unknown as PostRow[]).map(toPublic);
}

async function fetchPost(slug: string, includeDrafts: boolean): Promise<PublicPost | null> {
  const row = await db.query.posts.findFirst({
    where: eq(posts.slug, slug),
    with: RELATIONS as never,
  });
  if (!row) return null;
  const pub = toPublic(row as unknown as PostRow);
  if (!includeDrafts) {
    const live =
      pub.status === 'published' ||
      (pub.status === 'scheduled' && new Date(pub.date).getTime() <= Date.now());
    if (!live) return null;
  }
  return pub;
}

export async function getPosts(): Promise<PublicPost[]> {
  if (isDraftMode()) return fetchPosts(true);
  return unstable_cache(() => fetchPosts(false), ['posts:list'], {
    tags: ['posts'],
    revalidate: BLOG_REVALIDATE_SECONDS,
  })();
}

export async function getPost(slug: string): Promise<PublicPost | null> {
  if (isDraftMode()) return fetchPost(slug, true);
  return unstable_cache(() => fetchPost(slug, false), ['post', slug], {
    tags: ['posts', `post:${slug}`],
    revalidate: BLOG_REVALIDATE_SECONDS,
  })();
}

export async function getPostSlugs(): Promise<string[]> {
  try {
    const list = await getPosts();
    return list.map((p) => p.slug);
  } catch {
    return [];
  }
}
