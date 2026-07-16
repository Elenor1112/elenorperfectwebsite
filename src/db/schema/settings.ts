import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { timestamps } from './helpers';

// Grouped key-value settings. Keys (each with a zod schema in
// src/lib/validation/settings.ts): 'site' | 'theme' | 'analytics' |
// 'contact' | 'work'. Adding a group requires no migration.
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamps.updatedAt,
});
