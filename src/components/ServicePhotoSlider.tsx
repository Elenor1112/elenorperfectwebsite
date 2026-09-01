'use client';

// Hero-side photo slider for service pages (replaces the rotating 3D icon).
// Crossfades through real client work delivered for this service. Pauses on
// hover and respects prefers-reduced-motion (shows a static first image with
// manual dots instead of auto-advancing).

import { useEffect, useRef, useState } from 'react';

export type SliderImage = { url: string; alt: string; client: string };

const INTERVAL_MS = 2200;

export function ServicePhotoSlider({
  images,
  serviceName,
}: {
  images: SliderImage[];
  serviceName: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (paused || images.length < 2) return;
    const t = setInterval(() => {
      if (!reduced.current) setIndex((i) => (i + 1) % images.length);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused, images.length]);

  if (images.length === 0) return null;
  const current = images[index] ?? images[0];
  const go = (delta: number) =>
    setIndex((i) => (i + delta + images.length) % images.length);

  return (
    <div
      className="group relative h-64 w-full overflow-hidden rounded-3xl glass lg:h-80"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label={`${serviceName} — recent work`}
    >
      {images.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img.url}
          src={img.url}
          alt={img.alt}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          aria-hidden={i !== index}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}

      {/* Scrim so the caption stays readable over any photo */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

      {current.client ? (
        <p className="absolute bottom-4 left-5 text-sm font-medium text-white/90 drop-shadow">
          {current.client}
          <span className="ml-2 text-xs font-normal text-white/55">{serviceName}</span>
        </p>
      ) : null}

      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm opacity-100 lg:opacity-0 transition hover:bg-black/55 hover:text-white focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 group-hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm opacity-100 lg:opacity-0 transition hover:bg-black/55 hover:text-white focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 group-hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      ) : null}

      {images.length > 1 ? (
        <div className="absolute bottom-4 right-4 flex gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-white/90' : 'w-1.5 bg-white/35 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
