'use client';

// Hero-side photo slider for service pages (replaces the rotating 3D icon).
// Crossfades through real client work delivered for this service. Pauses on
// hover and respects prefers-reduced-motion (shows a static first image with
// manual dots instead of auto-advancing).

import { useEffect, useRef, useState } from 'react';

export type SliderImage = { url: string; alt: string; client: string };

const INTERVAL_MS = 3500;

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
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
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
