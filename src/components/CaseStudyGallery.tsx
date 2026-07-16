'use client';

import { useEffect, useRef, useState } from 'react';

// One service tab on a case study page: a label and the images shown under it.
export type ServiceGallery = {
  id: string;
  label: string;
  images: string[];
};

export type ClientCaseStudy = {
  clientName: string;
  services: ServiceGallery[];
};

export interface CaseStudyGalleryProps {
  caseStudy: ClientCaseStudy;
}

type LightboxImage = {
  src: string;
  alt: string;
};

// Tabbed per-service image gallery for a case study page. One tab per service
// the client received; the active tab shows a responsive image grid, and any
// image opens in a lightbox. Tab switches remount the panel (key=id) so the
// 200ms fade-in animation replays; the global prefers-reduced-motion rule in
// globals.css collapses all animation/transition durations, so no extra
// handling is needed here.
export function CaseStudyGallery({ caseStudy }: CaseStudyGalleryProps) {
  const { clientName, services } = caseStudy;
  const [activeId, setActiveId] = useState(services[0]?.id);
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // The grid tile that opened the lightbox, so focus can return to it on close.
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const active = services.find((s) => s.id === activeId) ?? services[0];

  // Arrow keys move focus along the tablist (Enter/Space on the focused tab
  // selects it — native button behaviour). Tabs stay in the page tab order.
  const onTabKeyDown = (e: React.KeyboardEvent, i: number) => {
    const last = services.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next !== null) {
      e.preventDefault();
      tabRefs.current[next]?.focus();
    }
  };

  // Lightbox: Escape closes, body scroll locks, focus moves to the close
  // button and returns to the opening tile afterwards.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      // The close button is the dialog's only interactive element; keep focus
      // on it so Tab can't wander into the page behind the overlay.
      if (e.key === 'Tab') e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (triggerRef.current) triggerRef.current.focus();
    };
  }, [lightbox]);

  if (!active) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label={`${clientName} services`}
        className="flex gap-1 overflow-x-auto border-b border-white/10"
      >
        {services.map((s, i) => {
          const selected = s.id === active.id;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${s.id}`}
              aria-selected={selected}
              aria-controls={`panel-${s.id}`}
              onClick={() => setActiveId(s.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan ${
                selected
                  ? 'border-brand-cyan text-brand-cyan'
                  : 'border-transparent text-white/55 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* key remounts the panel on tab switch so the fade-in replays. */}
      <div
        key={active.id}
        role="tabpanel"
        id={`panel-${active.id}`}
        aria-labelledby={`tab-${active.id}`}
        className="mt-8 animate-fade-in"
      >
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {active.images.map((src, i) => {
            const alt = `${clientName} — ${active.label}, image ${i + 1} of ${active.images.length}`;
            return (
              <li key={src}>
                <button
                  type="button"
                  onClick={(e) => {
                    triggerRef.current = e.currentTarget;
                    setLightbox({ src, alt });
                  }}
                  aria-label={`View full-size: ${alt}`}
                  className="block w-full overflow-hidden rounded-lg transition duration-300 hover:scale-[1.02] hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
                >
                  {/* Plain <img>: gallery paths are static placeholders in
                      /public, so the next/image optimizer adds nothing here. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-lg bg-white/[0.04] object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt}
          className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-ink/95 p-6 backdrop-blur-sm md:p-12"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            ref={closeRef}
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close full-size image"
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full glass text-2xl leading-none text-white/80 transition-colors duration-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
