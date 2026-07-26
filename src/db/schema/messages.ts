import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { messageStatusEnum } from './enums';
import { timestamps } from './helpers';

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    company: text('company').default('').notNull(),
    phone: text('phone').default('').notNull(),
    role: text('role').default('').notNull(),
    service: text('service').default('').notNull(),
    budget: text('budget').default('').notNull(),
    message: text('message').notNull(),
    status: messageStatusEnum('status').default('new').notNull(),
    internalNote: text('internal_note').default('').notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => ({
    statusCreatedIdx: index('contact_messages_status_created_idx').on(t.status, t.createdAt),
  }),
);
