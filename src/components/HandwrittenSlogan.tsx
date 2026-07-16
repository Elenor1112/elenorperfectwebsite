'use client';

import { Fragment, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Caveat } from 'next/font/google';

// Script accent face, scoped to this component only (never touches the global
// --font-display/--font-sans stacks). Caveat is a variable font (400–700), so
// no explicit weight list is needed.
const caveat = Caveat({ subsets: ['latin'], display: 'swap' });

// Handwritten slogan with a "being written" entrance: words rise and settle
// from a slight pen-tilt, staggered left to right. The full text is real,
// server-rendered HTML (SEO/GEO/AEO-visible); hiding happens only via GSAP
// after mount, so crawlers and no-JS visitors always see the text.
export function HandwrittenSlogan({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const words = el.querySelectorAll('[data-word]');

    gsap.set(words, { opacity: 0, y: 32, rotation: -8, transformOrigin: '0% 100%' });
    const tween = gsap.to(words, {
      opacity: 1,
      y: 0,
      rotation: 0,
      duration: 0.9,
      ease: 'back.out(1.7)',
      stagger: 0.13,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <p ref={ref} className={`${caveat.className} ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {/* The space sits outside each inline-block span — a trailing space
            inside one gets collapsed and the words would run together. */}
        {text.split(' ').map((word, i) => (
          <Fragment key={i}>
            <span data-word className="inline-block will-change-transform">
              {word}
            </span>{' '}
          </Fragment>
        ))}
      </span>
    </p>
  );
}
