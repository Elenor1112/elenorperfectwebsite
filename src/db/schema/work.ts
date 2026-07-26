import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { contentStatusEnum } from './enums';
import {
  timestamps,
  type MetricItem,
  type RichTextDoc,
  type TestimonialData,
} from './helpers';
import { seoColumns } from './seo';
import { media } from './media';

export const caseStudies = pgTable(
  'case_studies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    client: text('client').notNull(),
    // Primary industry — shown on the card badge and used as the detail-page label.
    industry: text('industry').default('').notNull(),
    // Every industry this study should surface under in the /work filter. Always
    // contains `industry`; extra entries let one study appear in several filters
    // (e.g. Coca-Cola under both FMCG and Industrial).
    industries: text('industries').array().default([]).notNull(),
    // Service display names as shown on cards; categories mirror the showcase
    // filter values (existing site convention).
    services: text('services').array().default([]).notNull(),
    categories: text('categories').array().default([]).notNull(),
    technologies: text('technologies').array().default([]).notNull(),
    result: text('result').default('').notNull(),
    description: jsonb('description').$type<RichTextDoc | null>(),
    metrics: jsonb('metrics').$type<MetricItem[]>().default([]).notNull(),
    testimonial: jsonb('testimonial').$type<TestimonialData>(),
    coverImageId: uuid('cover_image_id').references(() => media.id, { onDelete: 'set null' }),
    featured: boolean('featured').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    status: contentStatusEnum('status').default('published').notNull(),
    ...seoColumns,
    ...timestamps,
  },
  (t) => ({
    statusOrderIdx: index('case_studies_status_order_idx').on(t.status, t.sortOrder),
    featuredIdx: index('case_studies_featured_idx').on(t.featured),
  }),
);

export const caseStudyGalleries = pgTable('case_study_galleries', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseStudyId: uuid('case_study_id')
    .notNull()
    .references(() => caseStudies.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  serviceSlug: text('service_slug'),
  sortOrder: integer('sort_order').default(0).notNull(),
  // YouTube video URLs (unlisted uploads) shown alongside this gallery's
  // images — avoids self-hosting heavy video files through Blob storage.
  videoUrls: text('video_urls').array().default([]).notNull(),
});

export const caseStudyGalleryImages = pgTable(
  'case_study_gallery_images',
  {
    galleryId: uuid('gallery_id')
      .notNull()
      .references(() => caseStudyGalleries.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.galleryId, t.mediaId] }),
  }),
);

// Clients that appear in the /work roster grid without a case-study page.
export const rosterClients = pgTable('roster_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  industries: text('industries').array().default([]).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const caseStudiesRelations = relations(caseStudies, ({ one, many }) => ({
  coverImage: one(media, { fields: [caseStudies.coverImageId], references: [media.id] }),
  ogImage: one(media, { fields: [caseStudies.ogImageId], references: [media.id] }),
  galleries: many(caseStudyGalleries),
}));

export const caseStudyGalleriesRelations = relations(caseStudyGalleries, ({ one, many }) => ({
  caseStudy: one(caseStudies, {
    fields: [caseStudyGalleries.caseStudyId],
    references: [caseStudies.id],
  }),
  images: many(caseStudyGalleryImages),
}));

export const caseStudyGalleryImagesRelations = relations(caseStudyGalleryImages, ({ one }) => ({
  gallery: one(caseStudyGalleries, {
    fields: [caseStudyGalleryImages.galleryId],
    references: [caseStudyGalleries.id],
  }),
  media: one(media, { fields: [caseStudyGalleryImages.mediaId], references: [media.id] }),
}));
