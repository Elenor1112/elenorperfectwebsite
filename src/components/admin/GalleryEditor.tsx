'use client';

// Multi-image gallery editor: add from library, drag to reorder, remove.

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PickerDialog, type PickedMedia } from './media/MediaPicker';
import { Button } from './ui';

export function GalleryEditor({
  value,
  onChange,
}: {
  value: PickedMedia[];
  onChange: (items: PickedMedia[]) => void;
}) {
  const [picking, setPicking] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = value.findIndex((i) => i.id === active.id);
    const to = value.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(value, from, to));
  };

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {value.map((img) => (
              <GalleryTile key={img.id} img={img} onRemove={() => onChange(value.filter((i) => i.id !== img.id))} />
            ))}
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/20 text-white/40 transition hover:border-brand hover:text-brand-glow"
              aria-label="Add image"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </SortableContext>
      </DndContext>
      {value.length > 0 ? (
        <p className="mt-2 text-xs text-white/35">Drag tiles to reorder — the order shown here is the order on the site.</p>
      ) : null}
      {picking ? (
        <PickerDialog
          onClose={() => setPicking(false)}
          onPick={(m) => {
            if (!value.some((i) => i.id === m.id)) {
              onChange([...value, { id: m.id, url: m.url, alt: m.alt }]);
            }
            setPicking(false);
          }}
        />
      ) : null}
    </div>
  );
}

function GalleryTile({ img, onRemove }: { img: PickedMedia; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: img.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-white/10 active:cursor-grabbing ${isDragging ? 'z-10 opacity-80' : ''}`}
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.url} alt={img.alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      <button
        type="button"
        aria-label="Remove image"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 rounded-md bg-black/70 p-1 opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
