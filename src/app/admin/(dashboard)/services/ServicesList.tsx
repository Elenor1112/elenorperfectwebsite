'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteService, reorderServices, setServiceStatus } from '@/server/actions/services';
import { SortableList } from '@/components/admin/SortableList';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Badge, Switch } from '@/components/admin/ui';

type Row = {
  id: string;
  slug: string;
  name: string;
  short: string;
  status: string;
  updatedAt: string;
};

export function ServicesList({ items: initial }: { items: Row[] }) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();

  const onReorder = (next: Row[]) => {
    setItems(next); // optimistic
    startTransition(async () => {
      const res = await reorderServices(next.map((i) => i.id));
      if (!res.ok) toast.error('Reorder failed');
    });
  };

  const togglePublished = (row: Row, publish: boolean) => {
    const status = publish ? 'published' : 'draft';
    setItems((cur) => cur.map((i) => (i.id === row.id ? { ...i, status } : i))); // optimistic
    startTransition(async () => {
      const res = await setServiceStatus(row.id, status);
      if (!res.ok) {
        toast.error(res.error);
        setItems((cur) => cur.map((i) => (i.id === row.id ? { ...i, status: row.status } : i)));
      } else {
        toast.success(publish ? `${row.name} published` : `${row.name} hidden`);
      }
    });
  };

  const remove = (row: Row) =>
    startTransition(async () => {
      const res = await deleteService(row.id);
      if (res.ok) {
        setItems((cur) => cur.filter((i) => i.id !== row.id));
        toast.success('Service deleted');
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
            <Link href={`/admin/services/${row.id}`} className="font-medium hover:text-brand-glow">
              {row.name}
            </Link>
            <p className="truncate text-xs text-white/40">{row.short}</p>
          </div>
          <Badge value={row.status} />
          <Switch
            checked={row.status === 'published'}
            onCheckedChange={(v) => togglePublished(row, v)}
            aria-label={`Toggle ${row.name} visibility`}
          />
          <a
            href={`/services/${row.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-white/30 hover:text-white"
            aria-label={`View ${row.name} on site`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <ConfirmDialog
            title={`Delete “${row.name}”?`}
            description="The service page will return 404 and it disappears from menus, the FAQ hub, sitemap, and llms.txt."
            onConfirm={() => remove(row)}
          >
            <button type="button" className="text-white/30 hover:text-red-400" aria-label={`Delete ${row.name}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </ConfirmDialog>
        </div>
      )}
    />
  );
}
