import { relations } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './helpers';

export const faqCategories = pgTable('faq_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const faqs = pgTable(
  'faqs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    question: text('question').notNull(),
    // Plain text — FAQPage JSON-LD answers are plain text.
    answer: text('answer').notNull(),
    categoryId: uuid('category_id').references(() => faqCategories.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (t) => ({
    categoryOrderIdx: index('faqs_category_order_idx').on(t.categoryId, t.sortOrder),
  }),
);

export const faqCategoriesRelations = relations(faqCategories, ({ many }) => ({
  faqs: many(faqs),
}));

export const faqsRelations = relations(faqs, ({ one }) => ({
  category: one(faqCategories, { fields: [faqs.categoryId], references: [faqCategories.id] }),
}));
