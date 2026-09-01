'use client';

import { useEffect, useRef } from 'react';

// Persistent scroll-progress indicator: a thin top bar,
// per brief §7 (wayfinding that ties the visual system together).
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
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
    <div className="fixed inset-x-0 top-0 z-[70] h-[2px] bg-white/5">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-brand via-brand-glow to-brand-cyan"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
