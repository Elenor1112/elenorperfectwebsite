import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from './helpers';
import { seoColumns } from './seo';
import { media } from './media';

// One row per editable page ('home', 'about', plus hub pages for SEO-only
// editing: 'services', 'work', 'blog', 'faq', 'contact').
export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').default('').notNull(),
  ...seoColumns,
  updatedAt: timestamps.updatedAt,
});

// Typed-JSON section blocks. `type` selects a zod schema in
// src/lib/validation/sections.ts; `data` must validate against it. Media
// references inside `data` are stored as media UUIDs and resolved in the
// data layer.
export const pageSections = pgTable(
  'page_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().default({}).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    updatedAt: timestamps.updatedAt,
  },
  (t) => ({
    pageOrderIdx: index('page_sections_page_order_idx').on(t.pageId, t.sortOrder),
  }),
);

export const pagesRelations = relations(pages, ({ one, many }) => ({
  ogImage: one(media, { fields: [pages.ogImageId], references: [media.id] }),
  sections: many(pageSections),
}));

export const pageSectionsRelations = relations(pageSections, ({ one }) => ({
  page: one(pages, { fields: [pageSections.pageId], references: [pages.id] }),
}));
