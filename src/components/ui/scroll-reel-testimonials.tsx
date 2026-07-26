'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { getClientLogo } from '@/lib/data/client-logos';

// Testimonials with a counter-rotating "reel" of client tiles beside the
// featured quote. Quotes auto-cycle every 4s; hovering pauses, leaving resumes
// after 1s. Arrow buttons / arrow keys page manually. Keyframes live in
// globals.css (scroll-reel-*), so the global prefers-reduced-motion rule
// flattens the reel and character animations for free.

export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  company: string;
};

// Styling tokens — aligned with the site's design language (ink background,
// glass panels, white-opacity text, brand gradient accents).
const QUOTE_CLASSES =
  'font-display text-xl font-semibold leading-snug text-white/90 md:text-2xl lg:text-3xl';
const AUTHOR_CLASSES = 'text-sm text-white/55';
const FEATURED_SHADOW =
  'shadow-[0_0_45px_-10px_theme(colors.brand.glow)] ring-1 ring-brand-glow/40';

const TILE_GRADIENTS = [
  'from-brand via-brand-glow to-brand-cyan',
  'from-brand-cyan via-brand-glow to-brand',
  'from-brand-amber via-brand to-brand-glow',
  'from-brand-glow via-brand-cyan to-brand',
];

const AUTO_ADVANCE_MS = 4000;
const RESUME_DELAY_MS = 1000;

// Per-character text rise. Screen readers get the plain string; the animated
// characters are decorative. Words stay in inline-blocks so they wrap whole.
function RisingChars({ text, animate }: { text: string; animate: boolean }) {
  if (!animate) return <>{text}</>;
  const words = text.split(' ');
  let charIndex = 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, w) => (
          <span key={w} className="inline-block whitespace-pre">
            {(w < words.length - 1 ? word + ' ' : word)
              .split('')
              .map((ch, c) => {
                const delay = Math.min(charIndex++ * 12, 800);
                return (
                  <span
                    key={c}
                    className="inline-block"
                    style={{
                      animation:
                        'scroll-reel-char-rise 0.6s cubic-bezier(0.16,1,0.3,1) both',
                      animationDelay: `${delay}ms`,
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
          </span>
        ))}
      </span>
    </>
  );
}

// One vertically looping column of client tiles. Content is doubled and the
// track translates by -50% for a seamless loop; `direction` flips the
// keyframes so adjacent columns counter-rotate. Longhand animation properties
// (not the shorthand) so the group-hover play-state class can pause it.
function ReelColumn({
  items,
  direction,
  highlight,
}: {
  items: string[];
  direction: 'up' | 'down';
  highlight: string;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="relative h-full flex-1 overflow-hidden">
      <div
        className="flex flex-col group-hover:[animation-play-state:paused]"
        style={{
          animationName: `scroll-reel-${direction}`,
          animationDuration: `${items.length * 7}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
      >
        {doubled.map((name, i) => {
          const logo = getClientLogo(name);
          return (
            <div key={i} className="pb-3">
              <div
                className={[
                  'relative flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br px-3 transition-shadow duration-500',
                  TILE_GRADIENTS[i % TILE_GRADIENTS.length],
                  name === highlight ? FEATURED_SHADOW : '',
                ].join(' ')}
              >
                <div className="absolute inset-0 bg-ink/60" />
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo.url}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                    className={[
                      'relative max-h-14 w-auto max-w-[80%] object-contain',
                      logo.lightMark ? '' : 'brightness-0 invert',
                    ].join(' ')}
                  />
                ) : (
                  // Clients without a logo asset keep their name as text.
                  <span className="relative text-center font-display text-base font-semibold tracking-tight text-white/80">
                    {name}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArrowIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={dir === 'left' ? 'rotate-180' : ''}
    >
      <path
        d="M3 8h10m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ScrollReelTestimonials({
  testimonials,
  reelItems,
}: {
  testimonials: Testimonial[];
  /** Names shown in the reel columns; defaults to the testimonial companies. */
  reelItems?: string[];
}) {
  const reduce = useReducedMotion();
  // `prev` keeps the outgoing quote mounted for its exit animation.
  const [state, setState] = useState<{ index: number; prev: number | null }>({
    index: 0,
    prev: null,
  });
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = testimonials.length;
  const paginate = useCallback(
    (dir: number) =>
      setState((s) => ({
        index: (s.index + dir + count) % count,
        prev: s.index,
      })),
    [count]
  );

  // Auto-advance; the interval is torn down whenever hover pauses it (or
  // reduced motion disables it) and recreated on resume.
  useEffect(() => {
    if (paused || reduce || count < 2) return;
    const id = setInterval(() => paginate(1), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [paused, reduce, count, paginate]);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    []
  );

  const handleMouseEnter = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    setPaused(true);
  };
  const handleMouseLeave = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_DELAY_MS);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      paginate(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      paginate(1);
    }
  };

  const current = testimonials[state.index];
  const names =
    reelItems && reelItems.length > 0
      ? reelItems
      : testimonials.map((t) => t.company);
  const colA = names.filter((_, i) => i % 2 === 0);
  const colB = names.filter((_, i) => i % 2 === 1);

  return (
    <div
      role="region"
      aria-label="Client testimonials"
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      className="group glass relative overflow-hidden rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-brand-glow/60"
    >
      <div className="flex flex-col lg:flex-row">
        {/* Reel — two counter-rotating columns of client tiles */}
        <div className="relative flex h-56 gap-3 overflow-hidden border-b border-white/10 p-4 lg:h-[26rem] lg:w-[38%] lg:border-b-0 lg:border-r">
          <ReelColumn items={colA} direction="up" highlight={current.company} />
          <ReelColumn items={colB} direction="down" highlight={current.company} />
          {/* Edge fades so tiles dissolve instead of clipping */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-ink to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-ink to-transparent" />
        </div>

        {/* Featured quote + controls */}
        <div className="flex flex-1 flex-col justify-between gap-10 p-7 md:p-10 lg:p-12">
          <div aria-live="polite" className="relative min-h-[8rem] md:min-h-[10rem]">
            <blockquote key={state.index} className={QUOTE_CLASSES}>
              &ldquo;
              <RisingChars text={current.quote} animate={!reduce} />
              &rdquo;
            </blockquote>
            {state.prev !== null && (
              <blockquote
                aria-hidden
                className={`${QUOTE_CLASSES} pointer-events-none absolute inset-0`}
                style={{ animation: 'scroll-reel-exit 0.35s ease both' }}
                onAnimationEnd={() =>
                  setState((s) => ({ ...s, prev: null }))
                }
              >
                &ldquo;{testimonials[state.prev].quote}&rdquo;
              </blockquote>
            )}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-display text-base font-semibold text-white/90">
                {current.author}
              </p>
              <p className={`mt-1 ${AUTHOR_CLASSES}`}>
                {current.role}, {current.company}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="mr-1 text-xs tabular-nums tracking-[0.22em] text-white/35">
                {String(state.index + 1).padStart(2, '0')} /{' '}
                {String(count).padStart(2, '0')}
              </span>
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={() => paginate(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/80 transition-all duration-300 hover:scale-105 hover:border-white/40 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow"
              >
                <ArrowIcon dir="left" />
              </button>
              <button
                type="button"
                aria-label="Next testimonial"
                onClick={() => paginate(1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/80 transition-all duration-300 hover:scale-105 hover:border-white/40 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow"
              >
                <ArrowIcon dir="right" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
