'use client';

// Blog post editor: rich text, category (with inline create), tags, cover
// image, draft/publish/schedule, and SEO. Autosaves existing posts.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { deletePost, savePost, savePostCategory } from '@/server/actions/posts';
import type { PostInput } from '@/lib/validation/content';
import type { RichTextDoc } from '@/db/schema';
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/admin/ui';
import { MediaPicker, type PickedMedia } from '@/components/admin/media/MediaPicker';
import { SeoFieldset, type SeoValue, emptySeo } from '@/components/admin/SeoFieldset';
import { useAutosave, SaveStatusLabel } from '@/components/admin/useAutosave';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

const RichTextEditor = dynamic(
  () => import('@/components/admin/RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="min-h-[320px] animate-pulse rounded-xl bg-white/[0.03]" /> },
);

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export type PostFormValue = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  body: RichTextDoc;
  coverImage: PickedMedia | null;
  authorName: string;
  authorTitle: string;
  categoryId: string | null;
  tags: string[];
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  /** datetime-local string in the editor's local time, or ''. */
  publishedAtLocal: string;
  seo: SeoValue;
};

export const emptyPost: PostFormValue = {
  slug: '',
  title: '',
  excerpt: '',
  body: { type: 'doc', content: [] },
  coverImage: null,
  authorName: '',
  authorTitle: '',
  categoryId: null,
  tags: [],
  status: 'draft',
  publishedAtLocal: '',
  seo: emptySeo,
};

function toInput(v: PostFormValue): PostInput {
  return {
    id: v.id,
    slug: v.slug,
    title: v.title,
    excerpt: v.excerpt,
    body: v.body,
    coverImageId: v.coverImage?.id ?? null,
    authorName: v.authorName,
    authorTitle: v.authorTitle,
    categoryId: v.categoryId,
    tags: v.tags,
    status: v.status,
    publishedAt: v.publishedAtLocal ? new Date(v.publishedAtLocal).toISOString() : null,
    seo: {
      seoTitle: v.seo.seoTitle,
      seoDescription: v.seo.seoDescription,
      ogImageId: v.seo.ogImage?.id ?? null,
      canonicalUrl: v.seo.canonicalUrl,
      noIndex: v.seo.noIndex,
      seoKeywords: v.seo.seoKeywords,
    },
  };
}

export function PostForm({
  initial,
  categories: initialCategories,
}: {
  initial: PostFormValue;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [categories, setCategories] = useState(initialCategories);
  const isNew = !initial.id;

  const doSave = useMemo(
    () => async () => {
      const res = await savePost(toInput(value));
      if (!res.ok) {
        toast.error(res.error);
        return false;
      }
      if (isNew) {
        toast.success('Post created');
        router.replace(`/admin/posts/${res.id}`);
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, isNew],
  );

  const { status, notify, flush } = useAutosave(doSave);

  const set = <K extends keyof PostFormValue>(key: K, v: PostFormValue[K]) => {
    setValue((cur) => ({ ...cur, [key]: v }));
    if (!isNew) notify();
  };

  const addCategory = async () => {
    const name = prompt('New category name');
    if (!name?.trim()) return;
    const res = await savePostCategory(name);
    if (res.ok) {
      setCategories((cur) => [...cur, { id: res.id, name: name.trim() }]);
      set('categoryId', res.id);
      toast.success('Category created');
    } else toast.error(res.error);
  };

  const remove = async () => {
    if (!value.id) return;
    const res = await deletePost(value.id);
    if (res.ok) {
      toast.success('Post deleted');
      router.replace('/admin/posts');
    } else toast.error(res.error);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isNew ? 'New post' : `Edit: ${value.title || value.slug}`}
        actions={
          <div className="flex items-center gap-3">
            <SaveStatusLabel status={status} />
            {!isNew ? (
              value.status === 'published' ? (
                <a href={`/blog/${value.slug}`} target="_blank" rel="noreferrer" className="text-xs text-brand-glow hover:underline">
                  View on site ↗
                </a>
              ) : (
                <a
                  href={`/api/preview?path=${encodeURIComponent(`/blog/${value.slug}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-amber hover:underline"
                >
                  Preview draft ↗
                </a>
              )
            ) : null}
            <Button onClick={() => flush()}>{isNew ? 'Create post' : 'Save'}</Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card className="space-y-4">
          <Field label="Title">
            <Input
              value={value.title}
              onChange={(e) => {
                const title = e.target.value;
                setValue((cur) => ({
                  ...cur,
                  title,
                  slug: isNew && (!cur.slug || cur.slug === slugify(cur.title)) ? slugify(title) : cur.slug,
                }));
                if (!isNew) notify();
              }}
              placeholder="Post title"
            />
          </Field>
          <Field label="Slug" hint="URL: /blog/[slug]">
            <Input value={value.slug} onChange={(e) => set('slug', slugify(e.target.value))} />
          </Field>
          <Field label="Excerpt" hint="the summary shown on cards and in search results">
            <Textarea value={value.excerpt} onChange={(e) => set('excerpt', e.target.value)} rows={2} />
          </Field>
          <Field label="Cover image">
            <MediaPicker value={value.coverImage} onChange={(m) => set('coverImage', m)} />
          </Field>
        </Card>

        <Card>
          <h2 className="mb-4 font-display font-semibold">Article body</h2>
          <RichTextEditor
            value={value.body}
            onChange={(doc) => set('body', doc)}
            placeholder="Write the article… Reading time is computed automatically."
          />
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display font-semibold">Publishing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select
                value={value.status}
                onChange={(e) => {
                  const next = e.target.value as PostFormValue['status'];
                  setValue((cur) => ({
                    ...cur,
                    status: next,
                    // Scheduling needs a time; suggest tomorrow 09:00.
                    publishedAtLocal:
                      next === 'scheduled' && !cur.publishedAtLocal
                        ? defaultScheduleLocal()
                        : cur.publishedAtLocal,
                  }));
                  if (!isNew) notify();
                }}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field
              label={value.status === 'scheduled' ? 'Goes live at (your local time)' : 'Publish date'}
              hint={value.status === 'scheduled' ? 'appears on the site within ~5 min of this time' : 'optional override'}
            >
              <Input
                type="datetime-local"
                value={value.publishedAtLocal}
                onChange={(e) => set('publishedAtLocal', e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Author name">
              <Input value={value.authorName} onChange={(e) => set('authorName', e.target.value)} placeholder="Emad Samir" />
            </Field>
            <Field label="Author title">
              <Input value={value.authorTitle} onChange={(e) => set('authorTitle', e.target.value)} placeholder="CEO & Founder" />
            </Field>
          </div>
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Category">
              <Select
                value={value.categoryId ?? ''}
                onChange={(e) => set('categoryId', e.target.value || null)}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Button variant="secondary" size="sm" onClick={addCategory} className="mb-0.5">
              New category
            </Button>
          </div>
          <Field label="Tags" hint="comma-separated">
            <Input
              value={value.tags.join(', ')}
              onChange={(e) =>
                set(
                  'tags',
                  e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                )
              }
              placeholder="branding, social media"
            />
          </Field>
        </Card>

        <SeoFieldset
          value={value.seo}
          onChange={(v) => set('seo', v)}
          defaultTitle={value.title || undefined}
          defaultDescription={value.excerpt || undefined}
        />

        <div className="flex items-center justify-between">
          {!isNew ? (
            <ConfirmDialog
              title="Delete this post?"
              description="The article will return 404 and disappear from the blog, home preview, and sitemap."
              onConfirm={remove}
            >
              <Button variant="danger">Delete post</Button>
            </ConfirmDialog>
          ) : (
            <span />
          )}
          <Button onClick={() => flush()}>{isNew ? 'Create post' : 'Save changes'}</Button>
        </div>
      </div>
    </div>
  );
}

function defaultScheduleLocal(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
