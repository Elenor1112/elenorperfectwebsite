'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ExternalLink, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteCaseStudy,
  reorderCaseStudies,
  setCaseStudyStatus,
  saveCaseStudy,
} from '@/server/actions/work';
import { SortableList } from '@/components/admin/SortableList';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Badge, Switch, cn } from '@/components/admin/ui';

type Row = {
  id: string;
  slug: string;
  client: string;
  industry: string;
  status: string;
  featured: boolean;
  updatedAt: string;
};

export function WorkList({ items: initial }: { items: Row[] }) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();

  const onReorder = (next: Row[]) => {
    setItems(next);
    startTransition(async () => {
      const res = await reorderCaseStudies(next.map((i) => i.id));
      if (!res.ok) toast.error('Reorder failed');
    });
  };

  const togglePublished = (row: Row, publish: boolean) => {
    const status = publish ? 'published' : 'draft';
    setItems((cur) => cur.map((i) => (i.id === row.id ? { ...i, status } : i)));
    startTransition(async () => {
      const res = await setCaseStudyStatus(row.id, status);
      if (!res.ok) {
        toast.error(res.error);
        setItems((cur) => cur.map((i) => (i.id === row.id ? { ...i, status: row.status } : i)));
      }
    });
  };

  const remove = (row: Row) =>
    startTransition(async () => {
      const res = await deleteCaseStudy(row.id);
      if (res.ok) {
        setItems((cur) => cur.filter((i) => i.id !== row.id));
        toast.success('Case study deleted');
      } else toast.error(res.error);
    });

  return (
    <SortableList
      items={items}
      onReorder={onReorder}
      className="space-y-2"
      renderItem={(row) => (
        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link href={`/admin/work/${row.id}`} className="font-medium hover:text-brand-glow">
              {row.client}
            </Link>
            <p className="truncate text-xs text-white/40">{row.industry}</p>
          </div>
          {row.featured ? <Star className="h-4 w-4 fill-brand-amber text-brand-amber" aria-label="Featured" /> : null}
          <Badge value={row.status} />
          <Switch
            checked={row.status === 'published'}
            onCheckedChange={(v) => togglePublished(row, v)}
            aria-label={`Toggle ${row.client} visibility`}
          />
          <a
            href={`/work/${row.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-white/30 hover:text-white"
            aria-label={`View ${row.client} on site`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <ConfirmDialog
            title={`Delete “${row.client}”?`}
            description="The case study page will return 404 and it disappears from the work grid, home showcase, and sitemap."
            onConfirm={() => remove(row)}
          >
            <button type="button" className="text-white/30 hover:text-red-400" aria-label={`Delete ${row.client}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </ConfirmDialog>
        </div>
      )}
    />
  );
}
