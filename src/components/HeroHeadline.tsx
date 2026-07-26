'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Lightbulb } from 'lucide-react';

const STORAGE_KEY = 'elenor_hero_headline_seen';
const PREP_ID = 'elenor-hero-prep';

// ─────────────────────────────────────────────────────────────────────────
// Tunable timeline — every duration / delay / ease / typing speed lives here
// so the whole cinematic sequence can be re-timed from one place. Times are
// in seconds; TYPE_SPEED is characters-per-second (constant), converted to a
// per-word duration at runtime so long and short words type at the same pace.
// ─────────────────────────────────────────────────────────────────────────
const T = {
  startDelay: 0.15, // beat before "Where" / "Meets" arrive
  intro: { duration: 0.55, ease: 'power3.out' }, // "Where" + "Meets" fade/scale in
  bulb: {
    hangBeforeDrop: 0.12, // hold after the base words settle, before the drop
    dropDuration: 0.75, // fall + natural bounce
    dropEase: 'bounce.out',
    holdAfterBounce: 0.18, // let the bounce fully settle before it acts
    morphOut: 0.28, // bulb fades/scales away as typing begins
  },
  type: {
    speed: 13, // characters per second — constant across both words
    ease: 'none', // linear => genuinely constant sweep speed
    minDuration: 0.5, // floor so very short words still read as "typing"
  },
  badge: {
    in: 0.5, // scale + fade in
    inEase: 'back.out(1.7)',
    hold: 0.45, // brief hold before it becomes the word
    out: 0.3, // fade/scale away as "Quality" types in
  },
  restFadeUp: { duration: 0.6, stagger: 0.08, ease: 'power3.out' },
} as const;

// Pre-paint hide, mirroring the IntroAnimation pattern in reverse: the words
// are visible by default (SEO / no-JS safe), and this parser-blocking script
// hides them before first paint ONLY when the sequence is going to play this
// session — so there is no flash of the finished headline before the reveal,
// and returning visitors / reduced-motion users see the static headline with
// zero delay. [data-hero-rest] covers the eyebrow/sub/CTAs, which fade up
// after the headline settles.
const PREP_SCRIPT = `(function(){try{if(sessionStorage.getItem('${STORAGE_KEY}'))return;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;var s=document.createElement('style');s.id='${PREP_ID}';s.textContent='#hero-headline [data-hh],[data-hero-rest]{opacity:0}';document.head.appendChild(s);}catch(e){}})();`;

/** "Where Innovation" -> ["Where", "Innovation"]; single words get no rest. */
function splitLine(line: string): [string, string] {
  const trimmed = line.trim();
  const i = trimmed.indexOf(' ');
  return i === -1 ? [trimmed, ''] : [trimmed.slice(0, i), trimmed.slice(i + 1)];
}

/** Constant-speed type duration for a word, floored so short words still read. */
function typeDuration(word: string): number {
  return Math.max(T.type.minDuration, word.length / T.type.speed);
}

// Outline verified-quality badge — a circular medallion with a centered
// checkmark and two ribbon tails below. Uniform ~2px stroke, rounded caps and
// joins, monochrome (currentColor), transparent background, symmetrical.
function VerifiedBadge(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {/* Ribbon tails hanging below the medallion */}
      <path d="M8.5 14.8 6.6 21l2.9-1.7 1.4 2.5" />
      <path d="M15.5 14.8 17.4 21l-2.9-1.7-1.4 2.5" />
      {/* Circular medallion */}
      <circle cx="12" cy="9" r="7" />
      {/* Centered checkmark */}
      <path d="M8.7 9.2 11 11.5 15.3 7" />
    </svg>
  );
}

// Staged once-per-session headline reveal, redesigned as a synchronized,
// cinematic timeline:
//   Phase 1 — "Where" and "Meets" fade/scale in together, in their final
//             positions, leaving the empty slots where the accent words go.
//   Phase 2 — the teal bulb drops from above and bounces (untouched); once it
//             settles it morphs away and "Innovation" TYPES in left→right at a
//             constant speed via a clip-path sweep (no cursor, no layout shift).
//   Phase 3 — at the exact moment "Innovation" starts typing, a verified badge
//             fades/scales in over the "Quality." slot, holds, then fades out
//             as "Quality." TYPES in with identical speed/easing — perfectly
//             synchronized with "Innovation".
// Then the rest of the hero (eyebrow, sub, CTAs) fades up.
//
// Layout is reserved from frame one: all four words render in normal flow and
// are hidden with opacity only, so the h1 always has its final size and
// nothing reflows. The typing reveal animates clip-path on the already-laid-out
// word, so it never shifts surrounding text.
export function HeroHeadline({ line1, line2 }: { line1: string; line2: string }) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const [accent1, rest1] = splitLine(line1);
  const [accent2, rest2] = splitLine(line2);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const removePrep = () => document.getElementById(PREP_ID)?.remove();

    const q = (name: string) => root.querySelector<HTMLElement>(`[data-anim="${name}"]`);
    const where = q('where');
    const innovation = q('innovation');
    const bulb = q('bulb');
    const meets = q('meets');
    const quality = q('quality');
    const badge = q('badge');
    const baseWords = [where, meets].filter(Boolean) as HTMLElement[];
    const typedWords = [innovation, quality].filter(Boolean) as HTMLElement[];
    const restEls = Array.from(
      (root.closest('section') ?? document).querySelectorAll<HTMLElement>('[data-hero-rest]')
    );
    const allWords = [...baseWords, ...typedWords];

    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      // Storage unavailable: show the static headline rather than replaying
      // on every load.
      seen = true;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || reduced || !where || !meets) {
      removePrep();
      // A previous aborted run may have left inline styles behind (React 18
      // StrictMode double-invokes this effect in dev) — clear them so the
      // static headline is always fully visible on the skip path.
      gsap.set([...allWords, ...restEls], { clearProps: 'opacity,transform,clipPath' });
      if (bulb) gsap.set(bulb, { clearProps: 'opacity,transform' });
      if (badge) gsap.set(badge, { clearProps: 'opacity,transform' });
      return;
    }

    // Hide immediately (pre-paint, this is a layout effect) — covers client-side
    // navigations where the inline prep script doesn't re-execute. Typed words
    // are hidden via a fully-clipped clip-path so their layout box is preserved
    // (space reserved) but nothing paints until the sweep runs.
    gsap.set(baseWords, { opacity: 0 });
    gsap.set(typedWords, { opacity: 1, clipPath: 'inset(0 100% 0 0)' });
    if (badge) gsap.set(badge, { opacity: 0, scale: 0.6, transformOrigin: 'left center' });
    if (restEls.length) gsap.set(restEls, { opacity: 0, y: 24 });

    let cancelled = false;
    let intervalId: number | undefined;
    let tl: gsap.core.Timeline | undefined;

    // On a true first visit the full-screen IntroAnimation overlay owns the
    // screen; playing under it would be wasted. Its skip paths hide it with
    // display:none, and finishing unmounts it — wait for either.
    const waitForIntroGone = () =>
      new Promise<void>((resolve) => {
        const isGone = () => {
          const el = document.getElementById('elenor-intro');
          return !el || getComputedStyle(el).display === 'none';
        };
        if (isGone()) return resolve();
        const started = Date.now();
        intervalId = window.setInterval(() => {
          if (cancelled || isGone() || Date.now() - started > 15000) {
            window.clearInterval(intervalId);
            resolve();
          }
        }, 150);
      });

    (async () => {
      await waitForIntroGone();
      // The typing sweep is a clip on live layout, so wait for webfonts (capped
      // so a hung font load can never stall the reveal forever).
      await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 2500))]);
      if (cancelled) return;

      const hasBulbBeat = Boolean(innovation && bulb);
      const hasBadgeBeat = Boolean(quality && badge);

      // The bulb drops in from above the viewport and bounces to its resting
      // spot beside "Where" (same character as the intro's falling tagline).
      // Distance is measured from its resting position; the Math.max guard
      // keeps the start point above the screen even if the page is scrolled.
      let dropY = 0;
      if (hasBulbBeat) {
        gsap.set(bulb, { x: 0, y: 0, scale: 1 });
        const bulbBox = bulb!.getBoundingClientRect();
        dropY = -(Math.max(bulbBox.bottom, 0) + 24);
        gsap.set(bulb, { opacity: 0, y: dropY, transformOrigin: 'center center' });
      }

      // "Where"/"Meets" start slightly small + transparent, in their final slots.
      gsap.set(baseWords, { opacity: 0, scale: 0.9, transformOrigin: 'left center' });

      // Inline styles are set — the prep stylesheet has done its job.
      removePrep();
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {}

      tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          // End pixel-identical to the static headline: drop every inline
          // style GSAP applied (the bulb/badge keep their opacity-0 class).
          gsap.set(allWords, { clearProps: 'all' });
          if (restEls.length) gsap.set(restEls, { clearProps: 'all' });
          if (bulb) gsap.set(bulb, { clearProps: 'all' });
          if (badge) gsap.set(badge, { clearProps: 'all' });
        },
      });

      // ── Phase 1 — "Where" and "Meets" arrive together, in their final slots.
      tl.to(
        baseWords,
        { opacity: 1, scale: 1, duration: T.intro.duration, ease: T.intro.ease },
        T.startDelay
      );

      // ── Phase 2 — bulb drops + bounces (untouched), then "Innovation" types.
      // We label the exact instant "Innovation" begins typing so Phase 3's
      // "Quality" reveal can be pinned to the same moment.
      let typeStart: number;
      if (hasBulbBeat) {
        tl.set(bulb, { opacity: 1 }, `+=${T.bulb.hangBeforeDrop}`)
          .to(bulb, { y: 0, duration: T.bulb.dropDuration, ease: T.bulb.dropEase }, '<')
          .to({}, {}, `+=${T.bulb.holdAfterBounce}`); // let the bounce settle
        typeStart = tl.duration();
        // Bulb morphs away just as the word begins to type.
        tl.to(
          bulb,
          { opacity: 0, scale: 0.5, duration: T.bulb.morphOut, ease: 'power2.in' },
          typeStart
        );
        tl.to(
          innovation,
          {
            clipPath: 'inset(0 0% 0 0)',
            duration: typeDuration(rest1),
            ease: T.type.ease,
          },
          typeStart
        );
      } else {
        typeStart = tl.duration();
        if (innovation) {
          tl.to(
            innovation,
            { clipPath: 'inset(0 0% 0 0)', duration: typeDuration(rest1), ease: T.type.ease },
            typeStart
          );
        }
      }

      // ── Phase 3 — pinned to `typeStart`: badge fades/scales in over the
      // "Quality." slot, holds, then fades out as "Quality." types with the
      // exact same speed/easing as "Innovation".
      if (hasBadgeBeat) {
        tl.to(
          badge,
          { opacity: 1, scale: 1, duration: T.badge.in, ease: T.badge.inEase },
          typeStart
        );
        const qualityTypeStart = typeStart + T.badge.in + T.badge.hold;
        tl.to(
          badge,
          { opacity: 0, scale: 0.6, duration: T.badge.out, ease: 'power2.in' },
          qualityTypeStart
        );
        tl.to(
          quality,
          { clipPath: 'inset(0 0% 0 0)', duration: typeDuration(rest2), ease: T.type.ease },
          qualityTypeStart
        );
      }

      // ── Headline settled — bring in the rest of the hero.
      if (restEls.length) {
        tl.to(
          restEls,
          {
            opacity: 1,
            y: 0,
            duration: T.restFadeUp.duration,
            stagger: T.restFadeUp.stagger,
            ease: T.restFadeUp.ease,
          },
          '-=0.1'
        );
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      // If the sequence is torn down before it finished (StrictMode's dev
      // double-invoke, or navigating away mid-play), clear the session flag
      // so the next mount replays instead of skipping to a hidden headline.
      if (tl && tl.progress() < 1) {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {}
      }
      tl?.kill();
      removePrep();
    };
  }, [line1, line2]);

  return (
    <>
      <h1
        id="hero-headline"
        ref={rootRef}
        className="mt-6 max-w-4xl text-balance font-display text-5xl font-bold leading-[0.98] tracking-tight md:text-7xl lg:text-8xl"
      >
        <span className="block">
          <span data-hh data-anim="where" className="inline-block will-change-transform text-brand-glow">
            {accent1}
          </span>
          {rest1 ? (
            <>
              {' '}
              <span className="relative inline-block">
                <span
                  data-hh
                  data-anim="innovation"
                  className="inline-block will-change-[clip-path]"
                >
                  {rest1}
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2"
                >
                  <Lightbulb
                    data-anim="bulb"
                    className="block text-brand-glow opacity-0 will-change-transform"
                    style={{ width: '0.78em', height: '0.78em' }}
                    strokeWidth={1.75}
                  />
                </span>
              </span>
            </>
          ) : null}
        </span>
        <span className="block">
          <span data-hh data-anim="meets" className="inline-block will-change-transform text-brand-glow">
            {accent2}
          </span>
          {rest2 ? (
            <>
              {' '}
              <span className="relative inline-block">
                <span
                  data-hh
                  data-anim="quality"
                  className="inline-block will-change-[clip-path]"
                >
                  {rest2}
                </span>
                {/* Verified-quality badge occupying the "Quality." slot's left
                    edge — fades/scales in, holds, then fades out as the word
                    types over it. Absolutely positioned so it never affects
                    layout; opacity-0 by default for the static/skip fallback. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2"
                >
                  <VerifiedBadge
                    data-anim="badge"
                    className="block text-brand-glow opacity-0 will-change-transform"
                    style={{ width: '0.9em', height: '0.9em' }}
                  />
                </span>
              </span>
            </>
          ) : null}
        </span>
      </h1>

      <script dangerouslySetInnerHTML={{ __html: PREP_SCRIPT }} />
    </>
  );
}
