'use client';

// Multi-image gallery editor: add from library, drag to reorder, remove.

import { useState } from 'react';
import { Box, Plus, X } from 'lucide-react';
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
import { MediaPicker, PickerDialog, type PickedMedia } from './media/MediaPicker';
import { ModelPicker } from './media/ModelPicker';
import { Button, Field, Input, Select, Switch } from './ui';
import { youtubeThumbnailUrl } from '@/lib/youtube';
import type { ModelEnvironment } from '@/db/schema';

/**
 * One gallery item as edited in the admin. `image` items carry only their
 * picked media (the historical shape); `model` items add the viewer settings,
 * with `image` doubling as the optional poster.
 */
export type GalleryItemValue = {
  /** Stable client-side key — the DB row id when persisted, else a temp id. */
  key: string;
  type: 'image' | 'model';
  image: PickedMedia | null;
  model: PickedMedia | null;
  environmentPreset: ModelEnvironment;
  autoRotate: boolean;
  enableHoverRotation: boolean;
  enableMouseParallax: boolean;
  modelXOffset: number;
  modelYOffset: number;
};

const ENVIRONMENT_PRESETS: ModelEnvironment[] = [
  'forest',
  'studio',
  'city',
  'sunset',
  'warehouse',
];

export function newImageItem(image: PickedMedia): GalleryItemValue {
  return {
    key: image.id,
    type: 'image',
    image,
    model: null,
    environmentPreset: 'forest',
    autoRotate: false,
    enableHoverRotation: true,
    enableMouseParallax: true,
    modelXOffset: 0,
    modelYOffset: 0,
  };
}

export function GalleryVideoEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const url = draft.trim();
    if (!url || value.includes(url)) return;
    onChange([...value, url]);
    setDraft('');
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="https://youtu.be/…"
          aria-label="YouTube video URL"
        />
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          Add video
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {value.map((url) => {
            const thumb = youtubeThumbnailUrl(url);
            return (
              <div
                key={url}
                className="group relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <p className="flex h-full items-center justify-center px-2 text-center text-[10px] text-white/40">
                    Unrecognized URL
                  </p>
                )}
                <button
                  type="button"
                  aria-label="Remove video"
                  onClick={() => onChange(value.filter((u) => u !== url))}
                  className="absolute right-1.5 top-1.5 rounded-md bg-black/70 p-1 opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Image-only gallery editor, for surfaces that don't render 3D (service
 * pages). Adapts the plain `PickedMedia[]` shape those forms store onto the
 * item-based editor and hides the "add 3D model" affordance.
 */
export function ImageGalleryEditor({
  value,
  onChange,
}: {
  value: PickedMedia[];
  onChange: (items: PickedMedia[]) => void;
}) {
  return (
    <GalleryEditor
      allowModels={false}
      value={value.map(newImageItem)}
      onChange={(items) => onChange(items.flatMap((i) => (i.image ? [i.image] : [])))}
    />
  );
}

export function GalleryEditor({
  value,
  onChange,
  allowModels = true,
}: {
  value: GalleryItemValue[];
  onChange: (items: GalleryItemValue[]) => void;
  /** Set false on surfaces with no 3D rendering (e.g. service galleries). */
  allowModels?: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = value.findIndex((i) => i.key === active.id);
    const to = value.findIndex((i) => i.key === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(value, from, to));
  };

  const update = (key: string, patch: Partial<GalleryItemValue>) =>
    onChange(value.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const addModel = () =>
    onChange([
      ...value,
      {
        key: `model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'model',
        image: null,
        model: null,
        environmentPreset: 'forest',
        autoRotate: false,
        enableHoverRotation: true,
        enableMouseParallax: true,
        modelXOffset: 0,
        modelYOffset: 0,
      },
    ]);

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.map((i) => i.key)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {value.map((item) => (
              <GalleryTile
                key={item.key}
                item={item}
                onRemove={() => onChange(value.filter((i) => i.key !== item.key))}
                onChange={(patch) => update(item.key, patch)}
              />
            ))}
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/20 text-white/40 transition hover:border-brand hover:text-brand-glow"
              aria-label="Add image"
            >
              <Plus className="h-5 w-5" />
            </button>
            {allowModels ? (
              <button
                type="button"
                onClick={addModel}
                className="grid aspect-square place-items-center gap-1 rounded-lg border border-dashed border-white/20 text-white/40 transition hover:border-brand hover:text-brand-glow"
                aria-label="Add 3D model"
              >
                <Box className="h-5 w-5" />
                <span className="text-[10px]">3D</span>
              </button>
            ) : null}
          </div>
        </SortableContext>
      </DndContext>

      {value.length > 0 ? (
        <p className="mt-2 text-xs text-white/35">
          Drag tiles to reorder — the order shown here is the order on the site.
        </p>
      ) : null}

      {/* Settings panels sit below the grid so the tiles stay compact and
          reorderable; each is labelled with its position. */}
      {value.some((i) => i.type === 'model') ? (
        <div className="mt-4 space-y-3">
          {value.map((item, i) =>
            item.type === 'model' ? (
              <ModelItemSettings
                key={item.key}
                index={i + 1}
                item={item}
                onChange={(patch) => update(item.key, patch)}
              />
            ) : null,
          )}
        </div>
      ) : null}

      {picking ? (
        <PickerDialog
          onClose={() => setPicking(false)}
          onPick={(m) => {
            onChange([...value, newImageItem({ id: m.id, url: m.url, alt: m.alt })]);
            setPicking(false);
          }}
        />
      ) : null}
    </div>
  );
}

/** Per-model viewer settings: file, poster, preset, motion toggles, framing. */
function ModelItemSettings({
  index,
  item,
  onChange,
}: {
  index: number;
  item: GalleryItemValue;
  onChange: (patch: Partial<GalleryItemValue>) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Box className="h-4 w-4 text-brand-glow" />
        <p className="text-sm font-medium">3D model — item {index}</p>
        {!item.model ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
            no file yet
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Model file" hint=".glb, .gltf, .fbx or .obj — up to 100MB">
          <ModelPicker value={item.model} onChange={(model) => onChange({ model })} />
        </Field>
        <Field
          label="Poster image"
          hint="optional — shown instantly, then fades into the model. Its alt text describes the model."
        >
          <MediaPicker
            value={item.image}
            onChange={(image) => onChange({ image })}
            label="Choose poster"
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Field label="Environment">
          <Select
            value={item.environmentPreset}
            onChange={(e) =>
              onChange({ environmentPreset: e.target.value as ModelEnvironment })
            }
          >
            {ENVIRONMENT_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="X offset" hint="horizontal framing nudge">
          <Input
            type="number"
            step="0.1"
            value={item.modelXOffset}
            onChange={(e) => onChange({ modelXOffset: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Y offset" hint="vertical framing nudge">
          <Input
            type="number"
            step="0.1"
            value={item.modelYOffset}
            onChange={(e) => onChange({ modelYOffset: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ToggleRow
          label="Auto rotate"
          checked={item.autoRotate}
          onChange={(autoRotate) => onChange({ autoRotate })}
        />
        <ToggleRow
          label="Hover rotation"
          checked={item.enableHoverRotation}
          onChange={(enableHoverRotation) => onChange({ enableHoverRotation })}
        />
        <ToggleRow
          label="Mouse parallax"
          checked={item.enableMouseParallax}
          onChange={(enableMouseParallax) => onChange({ enableMouseParallax })}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
      <span className="text-xs text-white/70">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function GalleryTile({
  item,
  onRemove,
  onChange,
}: {
  item: GalleryItemValue;
  onRemove: () => void;
  onChange: (patch: Partial<GalleryItemValue>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
  });

  // Image items show themselves; model items show their poster if one is set.
  const thumb = item.image?.url;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative aspect-square cursor-grab overflow-hidden rounded-lg border active:cursor-grabbing ${
        item.type === 'model' ? 'border-brand/40' : 'border-white/10'
      } ${isDragging ? 'z-10 opacity-80' : ''}`}
      {...attributes}
      {...listeners}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={item.image?.alt ?? ''}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-white/[0.04] text-white/30">
          <Box className="h-5 w-5" />
        </div>
      )}

      {item.type === 'model' ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-brand-glow">
          3D
        </span>
      ) : null}

      <button
        type="button"
        aria-label={item.type === 'model' ? 'Remove 3D model' : 'Remove image'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 rounded-md bg-black/70 p-1 opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
