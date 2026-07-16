'use client';

// Editable list of short strings (what's-included bullets, process steps,
// technologies, keywords…) with drag reordering.

import { useId } from 'react';
import { Plus, X } from 'lucide-react';
import { SortableList } from './SortableList';
import { Button, Input } from './ui';

export function StringListEditor({
  value,
  onChange,
  placeholder = 'Add item…',
  addLabel = 'Add',
}: {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const baseId = useId();
  // Stable per-position ids for dnd; content edits don't reshuffle them.
  const items = value.map((text, i) => ({ id: `${baseId}-${i}`, text }));

  return (
    <div className="space-y-2">
      <SortableList
        items={items}
        onReorder={(next) => onChange(next.map((n) => n.text))}
        renderItem={(item, index) => (
          <div className="mb-2 flex items-center gap-2">
            <Input
              value={item.text}
              onChange={(e) => {
                const next = [...value];
                next[index] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
            />
            <button
              type="button"
              aria-label="Remove"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="shrink-0 rounded p-1.5 text-white/30 hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      />
      <Button variant="secondary" size="sm" onClick={() => onChange([...value, ''])}>
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}
