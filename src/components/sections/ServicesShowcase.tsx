'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export type ShowcaseFilter = {
  name: string; // must match a case study `categories` value exactly
  slug: string; // links to /services/[slug]
  tagline: string;
};

export type ShowcaseCard = {
  slug: string;
  client: string;
  categories: string[];
  result: string;
  coverImageUrl: string | null;
};

// Kijamii-style filterable services showcase.
//  - Left 30%: sticky vertical list of services. Hover previews a filter;
//    click locks it so it persists after mouseleave (click again to unlock,
//    click another service to move the lock).
//  - Right 70%: masonry grid of case-study cards. Non-matching cards fade back;
//    matching cards animate in with a staggered slide-up.
// All cards are always in the DOM (filtering only toggles visibility/opacity),
// so the section stays fully crawlable. `active === null` shows everything.

// A gradient "cover" per card, keyed by its first category, so cards read as
// distinct image tiles without needing real assets yet.
const COVERS: Record<string, string> = {
  'Brand Identity': 'from-[#68cad6] via-[#8bdae3] to-[#1aebe4]',
  'Social Media': 'from-[#36e0d0] via-[#80ffdb] to-[#1aebe4]',
  'Web & App Development': 'from-[#1aebe4] via-[#36e0d0] to-[#68cad6]',
  'Video Production': 'from-[#ffb547] via-[#ff7ea8] to-[#68cad6]',
  'AI & Motion Graphics': 'from-[#80ffdb] via-[#8bdae3] to-[#68cad6]',
  'Event Planning': 'from-[#ff7ea8] via-[#ffb547] to-[#8bdae3]',
  'Printing & Production': 'from-[#8bdae3] via-[#ffb547] to-[#ff7ea8]',
  'Giveaways': 'from-[#ffb547] via-[#80ffdb] to-[#36e0d0]',
  'Interior Design': 'from-[#8bdae3] via-[#36e0d0] to-[#80ffdb]',
};
const COVER_FALLBACK = 'from-[#68cad6] via-[#36e0d0] to-[#8bdae3]';

// Style maps are code-owned (Tailwind classes can't live in the DB — the
// compiler must see them). Keyed by service NAME; unknown names get fallbacks.
const LIST_GRADIENTS: Record<string, string> = {
  'Brand Identity': 'from-[#68cad6] to-[#8bdae3]',
  'Social Media': 'from-[#36e0d0] to-[#80ffdb]',
  'Web & App Development': 'from-[#1aebe4] to-[#68cad6]',
  'Video Production': 'from-[#ffb547] to-[#ff7ea8]',
  'AI & Motion Graphics': 'from-[#80ffdb] to-[#8bdae3]',
  'Event Planning': 'from-[#ff7ea8] to-[#ffb547]',
  'Printing & Production': 'from-[#8bdae3] to-[#ffb547]',
  Giveaways: 'from-[#ffb547] to-[#80ffdb]',
  'Interior Design': 'from-[#8bdae3] to-[#36e0d0]',
};
const LIST_GRADIENT_FALLBACK = 'from-[#68cad6] to-[#8bdae3]';

const PILL: Record<string, string> = {
  'Brand Identity': 'border-brand-glow/50 text-brand-glow',
  'Social Media': 'border-brand-cyan/50 text-brand-cyan',
  'Web & App Development': 'border-[#1aebe4]/50 text-[#1aebe4]',
  'Video Production': 'border-brand-amber/50 text-brand-amber',
  'AI & Motion Graphics': 'border-[#80ffdb]/50 text-[#80ffdb]',
  'Event Planning': 'border-[#ff7ea8]/50 text-[#ff7ea8]',
  'Printing & Production': 'border-[#8bdae3]/50 text-[#8bdae3]',
  Giveaways: 'border-[#ffb547]/50 text-[#ffb547]',
  'Interior Design': 'border-brand/50 text-brand-glow',
};
const PILL_FALLBACK = 'border-white/25 text-white/70';

export function ServicesShowcase({
  eyebrow,
  heading,
  filters,
  cards,
}: {
  eyebrow: string;
  heading: string;
  filters: ShowcaseFilter[];
  cards: ShowcaseCard[];
}) {
  // `locked` persists after mouseleave (set by click); `hovered` is transient.
  // The grid filters by `hovered ?? locked`, so hovering while locked previews
  // another service, and mouseleave falls back to the locked one — not to all.
  const [locked, setLocked] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const active = hovered ?? locked;

  const toggle = (name: string) =>
    setLocked((cur) => (cur === name ? null : name));

  // Order cards so matching ones come first when a filter is active — keeps the
  // masonry visually tight and lets the stagger read top-to-bottom.
  const ordered = useMemo(() => {
    if (!active) return cards;
    return [...cards].sort((a, b) => {
      const am = a.categories.includes(active) ? 0 : 1;
      const bm = b.categories.includes(active) ? 0 : 1;
      return am - bm;
    });
  }, [active, cards]);

  return (
    <section
      className="relative z-10 overflow-hidden py-24 md:py-32"
      aria-label="Our work by service"
    >
      <CurvedLines />

      <div className="container-x relative">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-tight md:text-5xl">
          {heading}
        </h2>

        <div className="mt-14 flex flex-col gap-12 lg:flex-row lg:gap-10">
          {/* LEFT — service list. Sticky on desktop; horizontal scroll on mobile. */}
          <div className="lg:w-[30%]">
            <div className="lg:sticky lg:top-28">
              <ul
                className="-mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-2 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
                role="tablist"
                aria-label="Filter work by service"
              >
                {filters.map((s) => {
                  const isActive = active === s.name;
                  const isLocked = locked === s.name;
                  const gradient = LIST_GRADIENTS[s.name] ?? LIST_GRADIENT_FALLBACK;
                  return (
                    <li key={s.slug} className="snap-start shrink-0 lg:shrink">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isLocked}
                        onClick={() => toggle(s.name)}
                        onMouseEnter={() => !reduce && setHovered(s.name)}
                        onMouseLeave={() => !reduce && setHovered(null)}
                        className={[
                          'group block w-full whitespace-nowrap rounded-xl px-4 py-3 text-left transition-colors lg:whitespace-normal lg:px-3 lg:py-4',
                          isLocked
                            ? 'active bg-white/[0.06] ring-1 ring-white/15'
                            : '',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'font-display text-xl font-semibold transition-all duration-300 md:text-3xl',
                            isActive
                              ? `bg-gradient-to-r ${gradient} bg-clip-text italic text-transparent`
                              : 'text-white/45 group-hover:text-white/80',
                          ].join(' ')}
                        >
                          {s.name}
                        </span>

                        {/* Tagline fades in below the active name */}
                        <AnimatePresence initial={false}>
                          {isActive && (
                            <motion.span
                              key="tagline"
                              initial={{ opacity: 0, height: 0, y: -4 }}
                              animate={{ opacity: 1, height: 'auto', y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -4 }}
                              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                              className="mt-1 block overflow-hidden text-sm leading-snug text-white/55"
                            >
                              {s.tagline}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-6 hidden text-xs text-white/35 lg:block">
                {locked
                  ? 'Click the selected service again to show all work.'
                  : 'Hover to preview a service — click to keep it selected.'}
              </p>
            </div>
          </div>

          {/* RIGHT — masonry grid of case-study cards */}
          <div className="lg:w-[70%]">
            <motion.div
              layout={!reduce}
              className="columns-1 gap-5 sm:columns-2 [column-fill:_balance]"
            >
              {ordered.map((card, i) => {
                const matches = !active || card.categories.includes(active);
                const primary = card.categories[0];
                const cover = COVERS[primary] ?? COVER_FALLBACK;
                const coverImage = card.coverImageUrl;
                return (
                  <motion.article
                    key={card.slug}
                    layout={!reduce}
                    initial={false}
                    animate={{
                      opacity: matches ? 1 : 0.18,
                      y: 0,
                      filter: matches ? 'blur(0px)' : 'blur(1px)',
                    }}
                    transition={{
                      duration: 0.5,
                      delay: reduce ? 0 : (matches ? Math.min(i, 8) * 0.05 : 0),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="mb-5 break-inside-avoid"
                  >
                    <Link
                      href={`/work/${card.slug}`}
                      className="group block overflow-hidden rounded-3xl glass transition-transform duration-500 hover:-translate-y-1"
                    >
                      {/* Cover with a diagonal cutout corner (top-right) */}
                      <div
                        className={`relative aspect-[4/3] bg-gradient-to-br ${cover}`}
                        style={{
                          clipPath:
                            'polygon(0 0, calc(100% - 2.5rem) 0, 100% 2.5rem, 100% 100%, 0 100%)',
                        }}
                      >
                        {coverImage && (
                          <img
                            src={coverImage}
                            alt={`${card.client} — ${primary}`}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        )}
                        <div className="absolute inset-0 bg-ink/25 mix-blend-multiply" />
                        <span className="absolute bottom-4 left-5 font-display text-lg font-semibold text-white/90 drop-shadow">
                          {card.client}
                        </span>
                      </div>

                      <div className="p-5">
                        <h3 className="font-display text-base font-semibold leading-snug text-white/90">
                          {card.result}
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {card.categories.slice(0, 2).map((c) => (
                            <span
                              key={c}
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                                PILL[c] ?? PILL_FALLBACK
                              }`}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Subtle animated curved horizontal lines behind the section (CSS/SVG only).
// Very low opacity; each path drifts slowly on a long loop.
function CurvedLines() {
  const lines = [0, 1, 2, 3, 4];
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.12]"
      aria-hidden
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="showcase-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1aebe4" stopOpacity="0" />
            <stop offset="50%" stopColor="#80ffdb" stopOpacity="1" />
            <stop offset="100%" stopColor="#8bdae3" stopOpacity="0" />
          </linearGradient>
        </defs>
        {lines.map((i) => {
          const y = 130 + i * 160;
          return (
            <path
              key={i}
              d={`M-100 ${y} C 360 ${y - 90}, 1080 ${y + 90}, 1540 ${y}`}
              stroke="url(#showcase-line)"
              strokeWidth="1.5"
              className="showcase-curve"
              style={{ animationDelay: `${i * -3}s` }}
            />
          );
        })}
      </svg>
    </div>
  );
}
