'use client';

// Page editor: SEO card + reorderable, collapsible section editors. Each
// section saves independently (explicit save; simple and predictable).

import { useState, useTransition } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  reorderSections,
  saveSection,
  savePageSeo,
  toggleSection,
} from '@/server/actions/pages';
import { SECTION_LABELS, type SectionType } from '@/lib/validation/sections';
import { SECTION_FIELDS, type FieldDef } from './sectionFields';
import { SortableList } from '@/components/admin/SortableList';
import { StringListEditor } from '@/components/admin/StringListEditor';
import { SeoFieldset, type SeoValue } from '@/components/admin/SeoFieldset';
import { MediaPicker, type PickedMedia } from '@/components/admin/media/MediaPicker';
import { Button, Card, Field, Input, PageHeader, Switch, Textarea, cn } from '@/components/admin/ui';

type SectionRow = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  isEnabled: boolean;
};

/* ------------------------- dotted-path get/set helpers ---------------------- */

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function setPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split('.');
  const clone: Record<string, unknown> = { ...obj };
  let cursor = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const next = cursor[keys[i]];
    cursor[keys[i]] = next && typeof next === 'object' ? { ...(next as object) } : {};
    cursor = cursor[keys[i]] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return clone;
}

/* --------------------------------- editor ----------------------------------- */

export function PageEditor({
  slug,
  title,
  seo,
  sections: initialSections,
}: {
  slug: string;
  title: string;
  seo: SeoValue;
  sections: SectionRow[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [seoValue, setSeoValue] = useState(seo);
  const [pageTitle, setPageTitle] = useState(title);
  const [, startTransition] = useTransition();

  const onReorder = (next: SectionRow[]) => {
    setSections(next);
    startTransition(async () => {
      const res = await reorderSections(slug, next.map((s) => s.id));
      if (!res.ok) toast.error('Reorder failed');
    });
  };

  const saveSeo = () =>
    startTransition(async () => {
      const res = await savePageSeo({
        slug,
        title: pageTitle,
        seo: {
          seoTitle: seoValue.seoTitle,
          seoDescription: seoValue.seoDescription,
          ogImageId: seoValue.ogImage?.id ?? null,
          canonicalUrl: seoValue.canonicalUrl,
          noIndex: seoValue.noIndex,
          seoKeywords: seoValue.seoKeywords,
        },
      });
      if (res.ok) toast.success('Page SEO saved');
      else toast.error('Save failed');
    });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Page: ${title || slug}`}
        description={
          sections.length > 0
            ? 'Drag sections to reorder, toggle to show/hide, expand to edit. Changes go live on save.'
            : 'This page has no editable sections — manage its SEO below.'
        }
        actions={
          <a
            href={slug === 'home' ? '/' : `/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-glow hover:underline"
          >
            View on site ↗
          </a>
        }
      />

      {sections.length > 0 ? (
        <SortableList
          items={sections}
          onReorder={onReorder}
          className="space-y-3"
          renderItem={(section) => (
            <SectionEditor
              key={section.id}
              section={section}
              onToggle={(isEnabled) => {
                setSections((cur) => cur.map((s) => (s.id === section.id ? { ...s, isEnabled } : s)));
                startTransition(async () => {
                  await toggleSection(section.id, isEnabled);
                });
              }}
              onSaved={(data) =>
                setSections((cur) => cur.map((s) => (s.id === section.id ? { ...s, data } : s)))
              }
            />
          )}
        />
      ) : null}

      <div className="mt-8 space-y-4">
        <Card className="space-y-4">
          <h2 className="font-display font-semibold">Page identity</h2>
          <Field label="Internal title">
            <Input value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} />
          </Field>
        </Card>
        <SeoFieldset value={seoValue} onChange={setSeoValue} />
        <div className="flex justify-end">
          <Button onClick={saveSeo}>Save page SEO</Button>
        </div>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  onToggle,
  onSaved,
}: {
  section: SectionRow;
  onToggle: (enabled: boolean) => void;
  onSaved: (data: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(section.data);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const fields = SECTION_FIELDS[section.type] ?? [];
  const label = SECTION_LABELS[section.type as SectionType] ?? section.type;

  const update = (path: string, value: unknown) => {
    setData((cur) => setPath(cur, path, value));
    setDirty(true);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveSection({ id: section.id, data, isEnabled: section.isEnabled });
      if (res.ok) {
        toast.success(`${label} saved`);
        setDirty(false);
        onSaved(data);
      } else toast.error(res.error ?? 'Save failed');
    });

  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/[0.03]', !section.isEnabled && 'opacity-60')}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <span className="font-display text-sm font-semibold">{label}</span>
          {dirty ? <span className="text-xs text-brand-amber">unsaved</span> : null}
          <ChevronDown className={cn('ml-auto h-4 w-4 text-white/40 transition', open && 'rotate-180')} />
        </button>
        <Switch checked={section.isEnabled} onCheckedChange={onToggle} aria-label={`Show ${label}`} />
      </div>

      {open ? (
        <div className="space-y-4 border-t border-white/10 p-4">
          {fields.map((f) => (
            <SectionField key={f.name} field={f} data={data} update={update} />
          ))}
          <div className="flex justify-end">
            <Button size="sm" onClick={save} disabled={pending || !dirty}>
              {pending ? 'Saving…' : 'Save section'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectionField({
  field,
  data,
  update,
}: {
  field: FieldDef;
  data: Record<string, unknown>;
  update: (path: string, value: unknown) => void;
}) {
  const raw = getPath(data, field.name);

  switch (field.kind) {
    case 'text':
      return (
        <Field label={field.label} hint={field.hint}>
          <Input value={String(raw ?? '')} onChange={(e) => update(field.name, e.target.value)} />
        </Field>
      );
    case 'textarea':
      return (
        <Field label={field.label} hint={field.hint}>
          <Textarea value={String(raw ?? '')} onChange={(e) => update(field.name, e.target.value)} rows={3} />
        </Field>
      );
    case 'number':
      return (
        <Field label={field.label} hint={field.hint}>
          <Input
            type="number"
            value={Number(raw ?? 0)}
            onChange={(e) => update(field.name, Number(e.target.value) || 0)}
            className="max-w-[140px]"
          />
        </Field>
      );
    case 'image': {
      // Narrowed rather than cast: section data is unknown-shaped jsonb, and a
      // row that predates this field (or carries a bare media id from an older
      // save) would otherwise reach MediaPicker as a string.
      const picked =
        raw && typeof raw === 'object' && typeof (raw as PickedMedia).url === 'string'
          ? (raw as PickedMedia)
          : null;
      return (
        <Field label={field.label} hint={field.hint}>
          <MediaPicker value={picked} onChange={(m) => update(field.name, m)} />
        </Field>
      );
    }
    case 'toggle':
      return (
        <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
          <div>
            <p className="text-sm">{field.label}</p>
            {field.hint ? <p className="text-xs text-white/40">{field.hint}</p> : null}
          </div>
          <Switch checked={Boolean(raw)} onCheckedChange={(v) => update(field.name, v)} aria-label={field.label} />
        </div>
      );
    case 'cta': {
      const cta = (raw as { label?: string; href?: string }) ?? {};
      return (
        <div>
          <p className="mb-1.5 text-xs font-medium text-white/60">{field.label}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={cta.label ?? ''}
              onChange={(e) => update(field.name, { ...cta, label: e.target.value })}
              placeholder="Button label"
              aria-label={`${field.label} text`}
            />
            <Input
              value={cta.href ?? ''}
              onChange={(e) => update(field.name, { ...cta, href: e.target.value })}
              placeholder="/contact"
              aria-label={`${field.label} link`}
            />
          </div>
        </div>
      );
    }
    case 'stringlist':
      return (
        <Field label={field.label} hint={field.hint}>
          <StringListEditor
            value={Array.isArray(raw) ? (raw as string[]) : []}
            onChange={(v) => update(field.name, v)}
          />
        </Field>
      );
    case 'items': {
      const items = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
      return (
        <div>
          <p className="mb-2 text-xs font-medium text-white/60">
            {field.label}
            {field.hint ? <span className="ml-2 font-normal text-white/30">{field.hint}</span> : null}
          </p>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-xl border border-white/10 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {field.fields.map((sub) => (
                    <div key={sub.name} className={sub.kind === 'textarea' ? 'sm:col-span-2' : ''}>
                      {sub.kind === 'textarea' ? (
                        <Textarea
                          value={String(item[sub.name] ?? '')}
                          onChange={(e) =>
                            update(
                              field.name,
                              items.map((x, j) => (j === i ? { ...x, [sub.name]: e.target.value } : x)),
                            )
                          }
                          placeholder={sub.label}
                          rows={2}
                          aria-label={sub.label}
                        />
                      ) : (
                        <Input
                          type={sub.kind === 'number' ? 'number' : 'text'}
                          value={sub.kind === 'number' ? Number(item[sub.name] ?? 0) : String(item[sub.name] ?? '')}
                          onChange={(e) =>
                            update(
                              field.name,
                              items.map((x, j) =>
                                j === i
                                  ? { ...x, [sub.name]: sub.kind === 'number' ? Number(e.target.value) || 0 : e.target.value }
                                  : x,
                              ),
                            )
                          }
                          placeholder={sub.label}
                          aria-label={sub.label}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => update(field.name, items.filter((_, j) => j !== i))}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                update(field.name, [
                  ...items,
                  Object.fromEntries(field.fields.map((f) => [f.name, f.kind === 'number' ? 0 : ''])),
                ])
              }
            >
              Add {field.label.replace(/s$/, '').toLowerCase()}
            </Button>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
