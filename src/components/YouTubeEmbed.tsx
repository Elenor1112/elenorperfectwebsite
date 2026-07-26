'use client';

import { useState } from 'react';
import { youtubeEmbedSrc, youtubeThumbnailUrl } from '@/lib/youtube';

// Facade pattern: renders a static thumbnail until clicked, then swaps in the
// real iframe. Keeps case-study pages fast — no YouTube JS/player loads until
// a visitor actually wants to watch.
export function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const embedSrc = youtubeEmbedSrc(url);
  const thumbnail = youtubeThumbnailUrl(url);
  if (!embedSrc) return null;

  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`${embedSrc}&autoplay=1`}
          title={title}
          allow="accelerate-compute; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-white/[0.04] transition duration-300 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/40">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-ink shadow-lg transition group-hover:scale-110">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
