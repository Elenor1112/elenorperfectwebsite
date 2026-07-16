'use client';

import { useState } from 'react';

export type FAQ = { q: string; a: string };

// Accessible accordion. The answers are always in the DOM (just visually
// collapsed) so they remain crawlable; FAQPage schema is rendered separately.
export function FaqList({ items }: { items: FAQ[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-white/10 overflow-hidden rounded-2xl glass">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.03]"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="font-display text-base font-semibold md:text-lg">
                {f.q}
              </span>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/20 text-sm transition-transform duration-300 ${
                  isOpen ? 'rotate-45 border-brand-glow text-brand-glow' : ''
                }`}
                aria-hidden
              >
                +
              </span>
            </button>
            <div
              className="grid transition-all duration-300"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-sm leading-relaxed text-white/60">
                  {f.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
