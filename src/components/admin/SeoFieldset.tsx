'use client';

// Per-entity SEO editor used on every content form. Value mirrors the
// seoInputSchema shape, with the OG image expanded for preview.

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { MediaPicker, type PickedMedia } from './media/MediaPicker';
import { Field, Input, Switch, Textarea } from './ui';

export type SeoValue = {
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: PickedMedia | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  seoKeywords: string[];
};

export const emptySeo: SeoValue = {
  seoTitle: null,
  seoDescription: null,
  ogImage: null,
  canonicalUrl: null,
  noIndex: false,
  seoKeywords: [],
};

export function SeoFieldset({
  value,
  onChange,
  defaultTitle,
  defaultDescription,
}: {
  value: SeoValue;
  onChange: (v: SeoValue) => void;
  /** What the page falls back to when a field is left empty. */
  defaultTitle?: string;
  defaultDescription?: string;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof SeoValue>(key: K, v: SeoValue[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="rounded-2xl border border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="font-display text-sm font-semibold">Search & social (SEO)</span>
          <span className="ml-3 text-xs text-white/40">
            {value.seoTitle || value.seoDescription || value.ogImage
              ? 'Customized'
              : 'Using sensible defaults'}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-white/40 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-white/10 p-5">
          <Field label="SEO title" hint={defaultTitle ? `empty = “${truncate(defaultTitle)}”` : 'empty = page default'}>
            <Input
              value={value.seoTitle ?? ''}
              onChange={(e) => set('seoTitle', e.target.value || null)}
              placeholder={defaultTitle}
              maxLength={200}
            />
          </Field>
          <Field
            label="Meta description"
            hint={`${(value.seoDescription ?? '').length}/160 recommended`}
          >
            <Textarea
              value={value.seoDescription ?? ''}
              onChange={(e) => set('seoDescription', e.target.value || null)}
              placeholder={defaultDescription}
              rows={3}
              maxLength={400}
            />
          </Field>
          <Field label="Social share image (OpenGraph)" hint="1200×630 recommended">
            <MediaPicker value={value.ogImage} onChange={(m) => set('ogImage', m)} />
          </Field>
          <Field label="Canonical URL" hint="only set to point search engines at a different URL">
            <Input
              value={value.canonicalUrl ?? ''}
              onChange={(e) => set('canonicalUrl', e.target.value || null)}
              placeholder="/path or https://…"
            />
          </Field>
          <Field label="Keywords" hint="comma-separated; optional">
            <Input
              value={value.seoKeywords.join(', ')}
              onChange={(e) =>
                set(
                  'seoKeywords',
                  e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean),
                )
              }
              placeholder="branding agency cairo, …"
            />
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
            <div>
              <p className="text-sm">Hide from search engines</p>
              <p className="text-xs text-white/40">
                Adds noindex and removes this page from the sitemap.
              </p>
            </div>
            <Switch checked={value.noIndex} onCheckedChange={(v) => set('noIndex', v)} aria-label="Hide from search engines" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const truncate = (s: string) => (s.length > 60 ? `${s.slice(0, 57)}…` : s);
