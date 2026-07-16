import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';
import { timestamps } from './helpers';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('EDITOR').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
});

export const sessions = pgTable(
  'sessions',
  {
    // SHA-256 hex of the raw cookie token — the raw token never touches the DB.
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamps.createdAt,
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
