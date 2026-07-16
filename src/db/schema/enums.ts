import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['SUPER_ADMIN', 'EDITOR']);
export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'scheduled',
  'published',
  'archived',
]);
export const mediaStorageEnum = pgEnum('media_storage', ['local', 'blob']);
export const messageStatusEnum = pgEnum('message_status', ['new', 'read', 'replied', 'archived']);
export const accentEnum = pgEnum('accent', ['brand', 'cyan', 'amber']);

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];
