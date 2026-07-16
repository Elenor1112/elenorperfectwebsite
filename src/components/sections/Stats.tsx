'use client';

import { useEffect, useRef, useState } from 'react';
import { Reveal } from '@/components/Reveal';
import type { SectionData } from '@/lib/validation/sections';

// Numbers are REAL DOM text (selectable, crawlable) overlaid on the motif —
// never rendered only inside canvas, per brief §7.
function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (reduced) return setN(value);
      const dur = 1400;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(Math.round(eased * value));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

export function Stats({ data }: { data: SectionData<'stats'> }) {
  return (
    <section className="relative z-10 border-y border-white/10 bg-ink/40 py-24 backdrop-blur-sm">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow">{data.eyebrow}</p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold md:text-4xl">
            {data.heading}
          </h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4">
          {data.items.map((s, i) => (
            <Reveal key={s.label} delay={i * 90}>
              <div className="group">
                <div className="font-display text-5xl font-bold text-gradient md:text-6xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-3 h-px w-10 bg-brand-glow/60 transition-all duration-500 group-hover:w-20" />
                <p className="mt-3 text-sm text-white/55">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        {data.footnote ? <p className="mt-12 text-sm text-white/35">{data.footnote}</p> : null}
      </div>
    </section>
  );
}
