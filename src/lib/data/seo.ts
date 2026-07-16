import 'server-only';
import type { Metadata } from 'next';
import { getPage } from './pages';

/** Metadata for a hub page from its CMS `pages` row, with static fallbacks
 *  (the pre-CMS values) when the row is missing or the DB is unreachable. */
export async function hubPageMetadata(
  slug: string,
  fallback: { title: string; description: string; canonical: string },
): Promise<Metadata> {
  const page = await getPage(slug).catch(() => null);
  return {
    title: page?.seo.title ?? fallback.title,
    description: page?.seo.description ?? fallback.description,
    alternates: { canonical: page?.seo.canonicalUrl ?? fallback.canonical },
    ...(page?.seo.noIndex ? { robots: { index: false, follow: false } } : {}),
    ...(page?.seo.ogImageUrl ? { openGraph: { images: [{ url: page.seo.ogImageUrl }] } } : {}),
  };
}
