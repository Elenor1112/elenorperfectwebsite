'use client';

import { useEffect, useRef, useState } from 'react';

// Persistent scroll-progress indicator: a thin top bar + a pixel-fill counter,
// per brief §7 (wayfinding that ties the visual system together).
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
        setPct(Math.round(p * 100));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[70] h-[2px] bg-white/5">
        <div
          ref={barRef}
          className="h-full origin-left bg-gradient-to-r from-brand via-brand-glow to-brand-cyan"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
      <div
        className="fixed bottom-6 right-6 z-[70] hidden select-none items-center gap-2 rounded-full glass px-3 py-1.5 text-[11px] font-medium tabular-nums text-white/60 md:flex"
        aria-hidden
      >
        <span className="inline-block h-1.5 w-1.5 rounded-[2px] bg-brand-cyan shadow-[0_0_8px] shadow-brand-cyan" />
        {String(pct).padStart(2, '0')}% explored
      </div>
    </>
  );
}
