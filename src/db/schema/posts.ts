import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { contentStatusEnum } from './enums';
import { timestamps, type RichTextDoc } from './helpers';
import { seoColumns } from './seo';
import { media } from './media';

export const postCategories = pgTable('post_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').default('').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
});

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    excerpt: text('excerpt').default('').notNull(),
    body: jsonb('body').$type<RichTextDoc>().notNull(),
    coverImageId: uuid('cover_image_id').references(() => media.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull(),
    authorTitle: text('author_title').default('').notNull(),
    categoryId: uuid('category_id').references(() => postCategories.id, {
      onDelete: 'set null',
    }),
    status: contentStatusEnum('status').default('draft').notNull(),
    // For status='scheduled' this is the go-live time; public queries treat a
    // scheduled post with publishedAt <= now() as live (no cron required).
    publishedAt: timestamp('published_at', { withTimezone: true }),
    readingMinutes: integer('reading_minutes').default(3).notNull(),
    ...seoColumns,
    ...timestamps,
  },
  (t) => ({
    statusPublishedIdx: index('posts_status_published_idx').on(t.status, t.publishedAt),
    categoryIdx: index('posts_category_idx').on(t.categoryId),
  }),
);

export const postTags = pgTable(
  'post_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.tagId] }),
  }),
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  coverImage: one(media, { fields: [posts.coverImageId], references: [media.id] }),
  ogImage: one(media, { fields: [posts.ogImageId], references: [media.id] }),
  category: one(postCategories, { fields: [posts.categoryId], references: [postCategories.id] }),
  tags: many(postTags),
}));

export const postCategoriesRelations = relations(postCategories, ({ many }) => ({
  posts: many(posts),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  posts: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));
