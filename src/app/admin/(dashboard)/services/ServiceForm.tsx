'use client';

// Full service editor. Autosaves 2.5s after the last change (existing
// services); new services are created on first explicit save.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { saveService } from '@/server/actions/services';
import type { ServiceInput } from '@/lib/validation/content';
import type { RichTextDoc } from '@/db/schema';
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/admin/ui';
import { StringListEditor } from '@/components/admin/StringListEditor';
import { MediaPicker, type PickedMedia } from '@/components/admin/media/MediaPicker';
import { GalleryEditor } from '@/components/admin/GalleryEditor';
import { SeoFieldset, type SeoValue, emptySeo } from '@/components/admin/SeoFieldset';
import { useAutosave, SaveStatusLabel } from '@/components/admin/useAutosave';

const RichTextEditor = dynamic(
  () => import('@/components/admin/RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="min-h-[260px] animate-pulse rounded-xl bg-white/[0.03]" /> },
);

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export type ServiceFormValue = {
  id?: string;
  slug: string;
  title: string;
  name: string;
  short: string;
  lede: string;
  metaDescription: string;
  body: RichTextDoc | null;
  included: string[];
  process: string[];
  proof: string[];
  faqs: { q: string; a: string }[];
  accent: 'brand' | 'cyan' | 'amber';
  icon: 'box' | 'torus' | 'octa' | 'sphere' | 'badge';
  featuredImage: PickedMedia | null;
  gallery: PickedMedia[];
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  seo: SeoValue;
};

export const emptyService: ServiceFormValue = {
  slug: '',
  title: '',
  name: '',
  short: '',
  lede: '',
  metaDescription: '',
  body: null,
  included: [],
  process: [],
  proof: [],
  faqs: [],
  accent: 'brand',
  icon: 'box',
  featuredImage: null,
  gallery: [],
  status: 'draft',
  seo: emptySeo,
};

function toInput(v: ServiceFormValue): ServiceInput {
  return {
    id: v.id,
    slug: v.slug,
    title: v.title,
    name: v.name,
    short: v.short,
    lede: v.lede,
    metaDescription: v.metaDescription,
    body: v.body,
    included: v.included.filter(Boolean),
    process: v.process.filter(Boolean),
    proof: v.proof.filter(Boolean),
    faqs: v.faqs.filter((f) => f.q && f.a),
    accent: v.accent,
    icon: v.icon,
    featuredImageId: v.featuredImage?.id ?? null,
    galleryMediaIds: v.gallery.map((g) => g.id),
    status: v.status,
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

export function ServiceForm({ initial }: { initial: ServiceFormValue }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const isNew = !initial.id;

  const doSave = useMemo(
    () => async () => {
      const res = await saveService(toInput(value));
      if (!res.ok) {
        toast.error(res.error);
        return false;
      }
      if (isNew) {
        toast.success('Service created');
        router.replace(`/admin/services/${res.id}`);
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, isNew],
  );

  const { status, notify, flush } = useAutosave(doSave);

  const set = <K extends keyof ServiceFormValue>(key: K, v: ServiceFormValue[K]) => {
    setValue((cur) => ({ ...cur, [key]: v }));
    if (!isNew) notify(); // autosave only once the row exists
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isNew ? 'New service' : `Edit: ${value.name || value.slug}`}
        actions={
          <div className="flex items-center gap-3">
            <SaveStatusLabel status={status} />
            {!isNew ? (
              value.status === 'published' ? (
                <a href={`/services/${value.slug}`} target="_blank" rel="noreferrer" className="text-xs text-brand-glow hover:underline">
                  View on site ↗
                </a>
              ) : (
                <a
                  href={`/api/preview?path=${encodeURIComponent(`/services/${value.slug}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-amber hover:underline"
                >
                  Preview draft ↗
                </a>
              )
            ) : null}
            <Button onClick={() => flush()}>{isNew ? 'Create service' : 'Save'}</Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name" hint="the H1 on the page">
              <Input
                value={value.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setValue((cur) => ({
                    ...cur,
                    name,
                    // Auto-derive slug/title while creating.
                    slug: isNew && (!cur.slug || cur.slug === slugify(cur.name)) ? slugify(name) : cur.slug,
                    title: isNew && (!cur.title || cur.title === cur.name) ? name : cur.title,
                  }));
                  if (!isNew) notify();
                }}
                placeholder="Brand Identity"
              />
            </Field>
            <Field label="Slug" hint="URL: /services/[slug]">
              <Input value={value.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder="brand-identity" />
            </Field>
          </div>
          <Field label="SEO topic title" hint="used in the page <title>">
            <Input value={value.title} onChange={(e) => set('title', e.target.value)} placeholder="Brand Identity Design" />
          </Field>
          <Field label="Short description" hint="cards, rail, footer">
            <Textarea value={value.short} onChange={(e) => set('short', e.target.value)} rows={2} />
          </Field>
          <Field label="Lede" hint="40–60 word direct answer at the top of the page">
            <Textarea value={value.lede} onChange={(e) => set('lede', e.target.value)} rows={3} />
          </Field>
          <Field label="Meta description">
            <Textarea value={value.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} rows={2} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status">
              <Select value={value.status} onChange={(e) => set('status', e.target.value as ServiceFormValue['status'])}>
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Accent color">
              <Select value={value.accent} onChange={(e) => set('accent', e.target.value as ServiceFormValue['accent'])}>
                <option value="brand">Brand blue</option>
                <option value="cyan">Cyan</option>
                <option value="amber">Amber</option>
              </Select>
            </Field>
            <Field label="3D icon">
              <Select value={value.icon} onChange={(e) => set('icon', e.target.value as ServiceFormValue['icon'])}>
                <option value="badge">Badge</option>
                <option value="box">Box</option>
                <option value="torus">Torus</option>
                <option value="octa">Octahedron</option>
                <option value="sphere">Sphere</option>
              </Select>
            </Field>
          </div>
          <Field label="Featured image" hint="optional; used on cards where available">
            <MediaPicker value={value.featuredImage} onChange={(m) => set('featuredImage', m)} />
          </Field>
        </Card>

        <Card>
          <h2 className="mb-4 font-display font-semibold">What’s included</h2>
          <StringListEditor value={value.included} onChange={(v) => set('included', v)} placeholder="Logo design and visual mark" />
        </Card>

        <Card>
          <h2 className="mb-4 font-display font-semibold">Process steps</h2>
          <StringListEditor value={value.process} onChange={(v) => set('process', v)} placeholder="Discovery & research" />
        </Card>

        <Card>
          <h2 className="mb-4 font-display font-semibold">Client proof</h2>
          <p className="mb-4 text-xs text-white/40">Named clients this service was delivered for.</p>
          <StringListEditor value={value.proof} onChange={(v) => set('proof', v)} placeholder="Coca-Cola" />
        </Card>

        <Card>
          <h2 className="mb-4 font-display font-semibold">Long description</h2>
          <p className="mb-4 text-xs text-white/40">Optional rich-text section rendered below the process.</p>
          <RichTextEditor value={value.body} onChange={(doc) => set('body', doc)} placeholder="Write the long-form description…" />
        </Card>

        <Card>
          <h2 className="mb-4 font-display font-semibold">Gallery</h2>
          <GalleryEditor value={value.gallery} onChange={(v) => set('gallery', v)} />
        </Card>

        <Card>
          <h2 className="mb-4 font-display font-semibold">FAQ</h2>
          <p className="mb-4 text-xs text-white/40">
            Shown on the service page and aggregated into the FAQ hub — FAQPage schema updates automatically.
          </p>
          <FaqRepeater value={value.faqs} onChange={(v) => set('faqs', v)} />
        </Card>

        <SeoFieldset
          value={value.seo}
          onChange={(v) => set('seo', v)}
          defaultTitle={value.title ? `${value.title} Agency in Cairo` : undefined}
          defaultDescription={value.metaDescription || undefined}
        />

        <div className="flex justify-end">
          <Button onClick={() => flush()}>{isNew ? 'Create service' : 'Save changes'}</Button>
        </div>
      </div>
    </div>
  );
}

export function FaqRepeater({
  value,
  onChange,
}: {
  value: { q: string; a: string }[];
  onChange: (v: { q: string; a: string }[]) => void;
}) {
  return (
    <div className="space-y-4">
      {value.map((f, i) => (
        <div key={i} className="rounded-xl border border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-3">
              <Input
                value={f.q}
                onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                placeholder="Question"
              />
              <Textarea
                value={f.a}
                onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                placeholder="Answer"
                rows={3}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...value, { q: '', a: '' }])}>
        Add question
      </Button>
    </div>
  );
}
