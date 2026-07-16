'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteTestimonial,
  reorderTestimonials,
  saveTestimonial,
  toggleTestimonial,
} from '@/server/actions/testimonials';
import { SortableList } from '@/components/admin/SortableList';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button, Card, Field, Input, Switch, Textarea, cn } from '@/components/admin/ui';

type Item = {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  isActive: boolean;
};

export function TestimonialsManager({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const [, startTransition] = useTransition();

  const onReorder = (next: Item[]) => {
    setItems(next);
    startTransition(async () => {
      await reorderTestimonials(next.map((i) => i.id));
    });
  };

  return (
    <div>
      <Button className="mb-5" onClick={() => setEditing('new')}>
        <Plus className="h-4 w-4" /> Add testimonial
      </Button>

      {items.length === 0 ? (
        <Card className="py-12 text-center text-white/40">No testimonials yet.</Card>
      ) : (
        <SortableList
          items={items}
          onReorder={onReorder}
          className="space-y-2"
          renderItem={(item) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className={cn('min-w-0 flex-1 text-left', !item.isActive && 'opacity-40')}
                >
                  <p className="line-clamp-2 text-sm text-white/80">“{item.quote}”</p>
                  <p className="mt-1 text-xs text-white/40">
                    {item.author} · {item.company}
                  </p>
                </button>
                <Switch
                  checked={item.isActive}
                  onCheckedChange={(v) => {
                    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, isActive: v } : i)));
                    startTransition(async () => {
                      await toggleTestimonial(item.id, v);
                    });
                  }}
                  aria-label="Show testimonial"
                />
                <ConfirmDialog
                  title="Delete this testimonial?"
                  description="It disappears from the home reel."
                  onConfirm={() =>
                    startTransition(async () => {
                      await deleteTestimonial(item.id);
                      setItems((cur) => cur.filter((i) => i.id !== item.id));
                      toast.success('Deleted');
                    })
                  }
                >
                  <button type="button" className="text-white/30 hover:text-red-400" aria-label="Delete testimonial">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </ConfirmDialog>
              </div>
            </div>
          )}
        />
      )}

      {editing ? (
        <EditDialog
          item={
            editing === 'new'
              ? { id: '', quote: '', author: '', role: '', company: '', isActive: true }
              : editing
          }
          isNew={editing === 'new'}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew) => {
            setItems((cur) => (isNew ? [...cur, saved] : cur.map((i) => (i.id === saved.id ? saved : i))));
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function EditDialog({
  item,
  isNew,
  onClose,
  onSaved,
}: {
  item: Item;
  isNew: boolean;
  onClose: () => void;
  onSaved: (item: Item, isNew: boolean) => void;
}) {
  const [value, setValue] = useState(item);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveTestimonial({
        id: isNew ? undefined : item.id,
        quote: value.quote,
        author: value.author,
        role: value.role,
        company: value.company,
        avatarId: null,
        isActive: value.isActive,
      });
      if (res.ok) {
        toast.success('Saved');
        onSaved({ ...value, id: res.id }, isNew);
      } else toast.error(res.error);
    });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0e0f16] p-6">
        <h2 className="font-display text-lg font-semibold">{isNew ? 'Add testimonial' : 'Edit testimonial'}</h2>
        <div className="mt-4 space-y-4">
          <Field label="Quote">
            <Textarea value={value.quote} onChange={(e) => setValue({ ...value, quote: e.target.value })} rows={3} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Author">
              <Input value={value.author} onChange={(e) => setValue({ ...value, author: e.target.value })} />
            </Field>
            <Field label="Role">
              <Input value={value.role} onChange={(e) => setValue({ ...value, role: e.target.value })} />
            </Field>
          </div>
          <Field label="Company">
            <Input value={value.company} onChange={(e) => setValue({ ...value, company: e.target.value })} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={pending || !value.quote || !value.author}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
