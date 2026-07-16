import { boolean, text, uuid } from 'drizzle-orm/pg-core';
import { media } from './media';

// Embedded per-entity SEO columns (chosen over a polymorphic seo table:
// one entity = one row = one query, trivial to consume in generateMetadata).
export const seoColumns = {
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  ogImageId: uuid('og_image_id').references(() => media.id, { onDelete: 'set null' }),
  canonicalUrl: text('canonical_url'),
  noIndex: boolean('no_index').default(false).notNull(),
  seoKeywords: text('seo_keywords').array(),
};
