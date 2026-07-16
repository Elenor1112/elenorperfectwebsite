'use client';

import { useState, useTransition } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteFaq,
  deleteFaqCategory,
  reorderFaqs,
  saveFaq,
  saveFaqCategory,
  toggleFaq,
} from '@/server/actions/faqs';
import { SortableList } from '@/components/admin/SortableList';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button, Card, Field, Input, Select, Switch, Textarea, cn } from '@/components/admin/ui';

type Category = { id: string; slug: string; name: string };
type Item = {
  id: string;
  question: string;
  answer: string;
  categoryId: string | null;
  isActive: boolean;
};

export function FaqManager({
  categories: initialCategories,
  items: initialItems,
}: {
  categories: Category[];
  items: Item[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [activeCat, setActiveCat] = useState<string | null>(initialCategories[0]?.id ?? null);
  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const [, startTransition] = useTransition();

  const shown = items.filter((i) => i.categoryId === activeCat);

  const addCategory = async () => {
    const name = prompt('Category name');
    if (!name?.trim()) return;
    const res = await saveFaqCategory(name);
    if (res.ok) {
      const cat = { id: res.id, slug: name.trim().toLowerCase().replace(/\s+/g, '-'), name: name.trim() };
      setCategories((cur) => [...cur, cat]);
      setActiveCat(res.id);
    } else toast.error(res.error);
  };

  const renameCategory = async (cat: Category) => {
    const name = prompt('Rename category', cat.name);
    if (!name?.trim()) return;
    const res = await saveFaqCategory(name, cat.id);
    if (res.ok) setCategories((cur) => cur.map((c) => (c.id === cat.id ? { ...c, name: name.trim() } : c)));
  };

  const removeCategory = (cat: Category) =>
    startTransition(async () => {
      await deleteFaqCategory(cat.id);
      setCategories((cur) => cur.filter((c) => c.id !== cat.id));
      setItems((cur) => cur.map((i) => (i.categoryId === cat.id ? { ...i, categoryId: null } : i)));
      if (activeCat === cat.id) setActiveCat(null);
      toast.success('Category deleted (questions kept, now uncategorized)');
    });

  const onReorder = (next: Item[]) => {
    setItems((cur) => {
      const others = cur.filter((i) => i.categoryId !== activeCat);
      return [...others, ...next];
    });
    startTransition(async () => {
      await reorderFaqs(next.map((i) => i.id));
    });
  };

  const onToggle = (item: Item, isActive: boolean) => {
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, isActive } : i)));
    startTransition(async () => {
      await toggleFaq(item.id, isActive);
    });
  };

  const remove = (item: Item) =>
    startTransition(async () => {
      await deleteFaq(item.id);
      setItems((cur) => cur.filter((i) => i.id !== item.id));
      toast.success('Question deleted');
    });

  return (
    <div>
      {/* Category tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <span
            key={c.id}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition',
              activeCat === c.id
                ? 'border-brand bg-brand/15 text-brand-glow'
                : 'border-white/15 text-white/60 hover:border-white/40',
            )}
          >
            <button type="button" onClick={() => setActiveCat(c.id)}>
              {c.name} ({items.filter((i) => i.categoryId === c.id).length})
            </button>
            {activeCat === c.id ? (
              <>
                <button type="button" onClick={() => renameCategory(c)} aria-label={`Rename ${c.name}`} className="opacity-60 hover:opacity-100">
                  <Pencil className="h-3 w-3" />
                </button>
                <ConfirmDialog
                  title={`Delete category “${c.name}”?`}
                  description="Its questions are kept but become uncategorized."
                  onConfirm={() => removeCategory(c)}
                >
                  <button type="button" aria-label={`Delete ${c.name}`} className="opacity-60 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </ConfirmDialog>
              </>
            ) : null}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setActiveCat(null)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs transition',
            activeCat === null
              ? 'border-brand bg-brand/15 text-brand-glow'
              : 'border-white/15 text-white/60 hover:border-white/40',
          )}
        >
          Uncategorized ({items.filter((i) => i.categoryId === null).length})
        </button>
        <Button variant="secondary" size="sm" onClick={addCategory}>
          <Plus className="h-3.5 w-3.5" /> Category
        </Button>
      </div>

      <Button className="mb-5" onClick={() => setEditing('new')}>
        <Plus className="h-4 w-4" /> Add question
      </Button>

      {shown.length === 0 ? (
        <Card className="py-12 text-center text-white/40">No questions in this category yet.</Card>
      ) : (
        <SortableList
          items={shown}
          onReorder={onReorder}
          className="space-y-2"
          renderItem={(item) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className={cn('min-w-0 flex-1 text-left font-medium hover:text-brand-glow', !item.isActive && 'text-white/40')}
                >
                  {item.question}
                </button>
                <Switch checked={item.isActive} onCheckedChange={(v) => onToggle(item, v)} aria-label="Enable question" />
                <ConfirmDialog title="Delete this question?" description="It is removed from the site and the FAQ schema." onConfirm={() => remove(item)}>
                  <button type="button" className="text-white/30 hover:text-red-400" aria-label="Delete question">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </ConfirmDialog>
              </div>
              <p className={cn('mt-1 line-clamp-2 text-xs text-white/45', !item.isActive && 'text-white/25')}>{item.answer}</p>
            </div>
          )}
        />
      )}

      {editing ? (
        <FaqEditDialog
          item={editing === 'new' ? { id: '', question: '', answer: '', categoryId: activeCat, isActive: true } : editing}
          isNew={editing === 'new'}
          categories={categories}
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

function FaqEditDialog({
  item,
  isNew,
  categories,
  onClose,
  onSaved,
}: {
  item: Item;
  isNew: boolean;
  categories: Category[];
  onClose: () => void;
  onSaved: (item: Item, isNew: boolean) => void;
}) {
  const [question, setQuestion] = useState(item.question);
  const [answer, setAnswer] = useState(item.answer);
  const [categoryId, setCategoryId] = useState(item.categoryId ?? '');
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveFaq({
        id: isNew ? undefined : item.id,
        question,
        answer,
        categoryId: categoryId || null,
        isActive: item.isActive,
      });
      if (res.ok) {
        toast.success('Saved');
        onSaved({ ...item, id: res.id, question, answer, categoryId: categoryId || null }, isNew);
      } else toast.error(res.error);
    });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0e0f16] p-6">
        <h2 className="font-display text-lg font-semibold">{isNew ? 'Add question' : 'Edit question'}</h2>
        <div className="mt-4 space-y-4">
          <Field label="Question">
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
          </Field>
          <Field label="Answer" hint="plain text — used verbatim in FAQPage schema">
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} />
          </Field>
          <Field label="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={pending || !question || !answer}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
