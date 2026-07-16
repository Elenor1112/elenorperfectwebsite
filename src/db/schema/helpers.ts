import { timestamp } from 'drizzle-orm/pg-core';

// NOTE: keep this file dependency-free (no table imports) — it is imported by
// every schema file and a table import here would create a cycle.
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

/** Tiptap document JSON as persisted in jsonb columns. */
export type RichTextDoc = { type: 'doc'; content?: unknown[] };

export type FaqItem = { q: string; a: string };
export type MetricItem = { label: string; value: string };
export type TestimonialData = { quote: string; author: string; role: string } | null;
