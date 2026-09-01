import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { mediaStorageEnum } from './enums';
import { timestamps } from './helpers';
import { users } from './auth';

export const mediaFolders = pgTable(
  'media_folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    parentId: uuid('parent_id'),
    createdAt: timestamps.createdAt,
  },
  (t) => ({
    uniqName: unique('media_folders_parent_name_unique').on(t.parentId, t.name),
  }),
);

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    folderId: uuid('folder_id').references(() => mediaFolders.id, { onDelete: 'set null' }),
    filename: text('filename').notNull(),
    // Either a site-relative path ("/assets/...") for pre-existing files or an
    // absolute Vercel Blob URL for uploads. Unique so seeding is idempotent.
    url: text('url').notNull().unique(),
    storage: mediaStorageEnum('storage').default('blob').notNull(),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    width: integer('width'),
    height: integer('height'),
    alt: text('alt').default('').notNull(),
    caption: text('caption').default('').notNull(),
    blurDataUrl: text('blur_data_url'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => ({
    folderIdx: index('media_folder_idx').on(t.folderId),
    filenameIdx: index('media_filename_idx').on(t.filename),
  }),
);

export const mediaFoldersRelations = relations(mediaFolders, ({ one, many }) => ({
  parent: one(mediaFolders, {
    fields: [mediaFolders.parentId],
    references: [mediaFolders.id],
    relationName: 'folder_parent',
  }),
  children: many(mediaFolders, { relationName: 'folder_parent' }),
  files: many(media),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  folder: one(mediaFolders, { fields: [media.folderId], references: [mediaFolders.id] }),
}));

// 3D model formats accepted by the media library, alongside images. Kept here
// so the upload route, the client uploader and the admin UI agree on one list.
export const MODEL_EXTENSIONS = ['.glb', '.gltf', '.fbx', '.obj'] as const;

export const MODEL_CONTENT_TYPES = [
  'model/gltf-binary',
  'model/gltf+json',
  // .fbx/.obj have no registered IANA type; browsers usually send an empty
  // string or octet-stream for them, so both are accepted and the extension
  // is what actually gates the upload.
  'application/octet-stream',
] as const;

/** True when a filename looks like a 3D model the viewer can load. */
export function isModelFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return MODEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
