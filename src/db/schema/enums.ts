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

// A case-study gallery item is either a still image or an interactive 3D model.
export const galleryItemTypeEnum = pgEnum('gallery_item_type', ['image', 'model']);
// drei <Environment preset> values exposed to editors.
export const modelEnvironmentEnum = pgEnum('model_environment', [
  'forest',
  'studio',
  'city',
  'sunset',
  'warehouse',
]);

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];
export type GalleryItemType = (typeof galleryItemTypeEnum.enumValues)[number];
export type ModelEnvironment = (typeof modelEnvironmentEnum.enumValues)[number];
