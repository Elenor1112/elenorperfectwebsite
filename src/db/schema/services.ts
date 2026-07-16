import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { accentEnum, contentStatusEnum } from './enums';
import { timestamps, type FaqItem, type RichTextDoc } from './helpers';
import { seoColumns } from './seo';
import { media } from './media';

export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    name: text('name').notNull(),
    short: text('short').default('').notNull(),
    lede: text('lede').default('').notNull(),
    metaDescription: text('meta_description').default('').notNull(),
    body: jsonb('body').$type<RichTextDoc | null>(),
    included: text('included').array().default([]).notNull(),
    process: text('process').array().default([]).notNull(),
    proof: text('proof').array().default([]).notNull(),
    faqs: jsonb('faqs').$type<FaqItem[]>().default([]).notNull(),
    accent: accentEnum('accent').default('brand').notNull(),
    // Key into the 3D iconShape map (code-owned progressive enhancement).
    icon: text('icon'),
    featuredImageId: uuid('featured_image_id').references(() => media.id, {
      onDelete: 'set null',
    }),
    sortOrder: integer('sort_order').default(0).notNull(),
    status: contentStatusEnum('status').default('published').notNull(),
    ...seoColumns,
    ...timestamps,
  },
  (t) => ({
    statusOrderIdx: index('services_status_order_idx').on(t.status, t.sortOrder),
  }),
);

export const serviceImages = pgTable(
  'service_images',
  {
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.serviceId, t.mediaId] }),
  }),
);

export const servicesRelations = relations(services, ({ one, many }) => ({
  featuredImage: one(media, { fields: [services.featuredImageId], references: [media.id] }),
  ogImage: one(media, { fields: [services.ogImageId], references: [media.id] }),
  gallery: many(serviceImages),
}));

export const serviceImagesRelations = relations(serviceImages, ({ one }) => ({
  service: one(services, { fields: [serviceImages.serviceId], references: [services.id] }),
  media: one(media, { fields: [serviceImages.mediaId], references: [media.id] }),
}));
