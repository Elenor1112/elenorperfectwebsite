'use client';

import React, { useRef } from 'react';
import Link from 'next/link';

/** A single slide: an image, plus an optional destination link. */
export interface SliderImage {
  src: string;
  /** Where clicking the card navigates. Empty for now. */
  href?: string;
  /** Optional alt text; falls back to a generic label. */
  alt?: string;
}

export interface ImageAutoSliderProps {
  /**
   * Slides to scroll. Accepts either bare URL strings or {src, href, alt}
   * objects. Duplicated internally for a seamless loop.
   */
  images: Array<string | SliderImage>;
  /** Seconds for one full loop. Lower = faster. Default 20. */
  speed?: number;
  /**
   * Called when a card is clicked, with the slide and its original index.
   * Fires alongside link navigation — use it for analytics or side effects.
   */
  onCardClick?: (image: SliderImage, index: number) => void;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

// Normalise both input shapes to a SliderImage.
const toSlide = (image: string | SliderImage): SliderImage =>
  typeof image === 'string' ? { src: image } : image;

export const ImageAutoSlider = ({
  images,
  speed = 20,
  onCardClick,
  className = '',
}: ImageAutoSliderProps) => {
  const slides = images.map(toSlide);

  // Duplicate images for a seamless loop — the keyframes translate by -50%,
  // so the second copy is exactly where the first began.
  const duplicatedSlides = [...slides, ...slides];

  // Arrow controls scrub the existing keyframe animation by shifting its
  // (negative) animation-delay — the auto-scroll itself is untouched, and the
  // infinite loop keeps the maths seamless. The base delay is hugely negative
  // so stepping backwards can never push the effective time positive (which
  // would freeze the strip in its pre-animation state).
  const trackRef = useRef<HTMLDivElement>(null);
  const baseDelay = -speed * 1000;
  const delayRef = useRef(baseDelay);
  const tweenRef = useRef(0);

  const scrollByCard = (dir: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    const setWidth = track.scrollWidth / 2; // width of one copy of the slides
    if (!first || !setWidth) return;

    const step = first.offsetWidth + 24; // card + gap-6
    // Seconds of animation time that move the strip by exactly one card.
    const delta = (step / setWidth) * speed * dir;
    const from = delayRef.current;
    const to = from - delta;
    const started = performance.now();

    // Tween the delay over ~350ms so the step glides instead of jumping.
    cancelAnimationFrame(tweenRef.current);
    const tick = (now: number) => {
      const t = Math.min((now - started) / 350, 1);
      const eased = 1 - (1 - t) ** 3;
      delayRef.current = from + (to - from) * eased;
      track.style.animationDelay = `${delayRef.current}s`;
      if (t < 1) tweenRef.current = requestAnimationFrame(tick);
    };
    tweenRef.current = requestAnimationFrame(tick);
  };

  return (
    <>
      <style>{`
        @keyframes image-auto-slider-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .image-auto-slider__track {
          animation: image-auto-slider-scroll ${speed}s linear infinite;
        }

        /* Hovering anywhere over the strip freezes the scroll so the card
           under the cursor can be read and clicked. */
        .image-auto-slider__viewport:hover .image-auto-slider__track {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .image-auto-slider__track {
            animation: none;
          }
        }

        .image-auto-slider__mask {
          mask: linear-gradient(
            90deg,
            transparent 0%,
            black 10%,
            black 90%,
            transparent 100%
          );
          -webkit-mask: linear-gradient(
            90deg,
            transparent 0%,
            black 10%,
            black 90%,
            transparent 100%
          );
        }

        .image-auto-slider__item {
          transition: transform 0.3s ease, filter 0.3s ease;
        }

        .image-auto-slider__item:hover {
          transform: scale(1.05);
          filter: brightness(1.1);
        }
      `}</style>

      <div
        className={`relative flex w-full items-center justify-center ${className}`}
      >
        <div className="relative z-10 flex w-full items-center justify-center py-8">
          {/* The viewport (hover-pause zone) wraps both the masked strip and the
              arrows, so hovering an arrow also pauses the scroll. The mask stays
              on the inner element so the arrows aren't faded by it. */}
          <div className="image-auto-slider__viewport relative w-full max-w-6xl">
            <div className="image-auto-slider__mask w-full">
              <div
                ref={trackRef}
                className="image-auto-slider__track flex w-max gap-6"
                style={{ animationDelay: `${baseDelay}s` }}
              >
              {duplicatedSlides.map((slide, index) => {
                const originalIndex = index % slides.length;
                return (
                  <Link
                    key={index}
                    href={slide.href ?? ''}
                    onClick={() => onCardClick?.(slide, originalIndex)}
                    aria-label={slide.alt ?? `Gallery image ${originalIndex + 1}`}
                    className="image-auto-slider__item block h-48 w-48 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 md:h-64 md:w-64 lg:h-80 lg:w-80"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.src}
                      alt={slide.alt ?? `Gallery image ${originalIndex + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </Link>
                );
              })}
              </div>
            </div>

            {/* Manual controls — step the strip one card in either direction. */}
            <button
              type="button"
              aria-label="Previous images"
              onClick={() => scrollByCard(-1)}
              className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next images"
              onClick={() => scrollByCard(1)}
              className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
