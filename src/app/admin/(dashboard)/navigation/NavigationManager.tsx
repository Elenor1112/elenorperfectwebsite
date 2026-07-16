'use client';

import { useId, useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { saveMenuItems } from '@/server/actions/navigation';
import { SortableList } from '@/components/admin/SortableList';
import { Button, Card, Input, Switch } from '@/components/admin/ui';

type Item = {
  label: string;
  url: string;
  isExternal: boolean;
  openInNewTab: boolean;
  isEnabled: boolean;
};

type Menu = { id: string; slug: string; name: string; items: Item[] };

const HINTS: Record<string, string> = {
  header: 'Links across the top of every page.',
  'header-cta': 'The highlighted button on the right of the header (first item is used).',
  'footer-company': 'The “Company” column in the footer.',
};

export function NavigationManager({ menus }: { menus: Menu[] }) {
  return (
    <div className="space-y-6">
      {menus.map((menu) => (
        <MenuEditor key={menu.id} menu={menu} />
      ))}
    </div>
  );
}

function MenuEditor({ menu }: { menu: Menu }) {
  const baseId = useId();
  const [items, setItems] = useState(menu.items);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  const rows = items.map((item, i) => ({ id: `${baseId}-${i}`, ...item }));

  const update = (index: number, patch: Partial<Item>) => {
    setItems((cur) => cur.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    setDirty(true);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveMenuItems({
        menuSlug: menu.slug,
        items: items.filter((i) => i.label && i.url),
      });
      if (res.ok) {
        toast.success(`${menu.name} saved`);
        setDirty(false);
      } else toast.error(res.error ?? 'Save failed');
    });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold">{menu.name}</h2>
          <p className="text-xs text-white/40">{HINTS[menu.slug] ?? ''}</p>
        </div>
        <Button size="sm" onClick={save} disabled={pending || !dirty}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <SortableList
        items={rows}
        onReorder={(next) => {
          setItems(next.map(({ id: _id, ...item }) => item));
          setDirty(true);
        }}
        className="space-y-2"
        renderItem={(row) => {
          const index = rows.findIndex((r) => r.id === row.id);
          return (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
              <Input
                value={row.label}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="Label"
                className="w-40"
                aria-label="Link label"
              />
              <Input
                value={row.url}
                onChange={(e) =>
                  update(index, {
                    url: e.target.value,
                    isExternal: /^https?:\/\//.test(e.target.value),
                  })
                }
                placeholder="/about or https://…"
                className="min-w-[180px] flex-1"
                aria-label="Link URL"
              />
              <label className="flex items-center gap-2 text-xs text-white/50">
                New tab
                <Switch
                  checked={row.openInNewTab}
                  onCheckedChange={(v) => update(index, { openInNewTab: v })}
                  aria-label="Open in new tab"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-white/50">
                Show
                <Switch
                  checked={row.isEnabled}
                  onCheckedChange={(v) => update(index, { isEnabled: v })}
                  aria-label="Show link"
                />
              </label>
              <button
                type="button"
                aria-label="Remove link"
                onClick={() => {
                  setItems((cur) => cur.filter((_, i) => i !== index));
                  setDirty(true);
                }}
                className="rounded p-1.5 text-white/30 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        }}
      />

      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() => {
          setItems((cur) => [
            ...cur,
            { label: '', url: '', isExternal: false, openInNewTab: false, isEnabled: true },
          ]);
          setDirty(true);
        }}
      >
        <Plus className="h-3.5 w-3.5" /> Add link
      </Button>
    </Card>
  );
}
