'use client';

import { useState } from 'react';
import Link from 'next/link';

export type WorkCard = {
  slug: string;
  client: string;
  industry: string;
  services: string[];
  result: string;
};
export type RosterItem = { name: string; industries: string[] };

const tints = ['from-brand/25', 'from-brand-cyan/20', 'from-brand-amber/20'];

// Filterable case-study gallery. Filter is a real DOM control (works without the
// 3D layer); each card is a real anchor to its case study page.
export function WorkGallery({
  caseStudies,
  clientRoster,
  industries,
}: {
  caseStudies: WorkCard[];
  clientRoster: RosterItem[];
  industries: string[];
}) {
  const [filter, setFilter] = useState<string>('All');
  const shown =
    filter === 'All' ? caseStudies : caseStudies.filter((c) => c.industry === filter);
  const rosterShown =
    filter === 'All'
      ? clientRoster
      : clientRoster.filter((c) => c.industries.includes(filter));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {industries.map((ind) => (
          <button
            key={ind}
            onClick={() => setFilter(ind)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              filter === ind
                ? 'bg-white text-ink'
                : 'border border-white/15 text-white/65 hover:border-white/40'
            }`}
          >
            {ind}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {shown.map((c, i) => (
          <Link
            key={c.slug}
            href={`/work/${c.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-3xl glass p-8 transition-all duration-500 hover:-translate-y-1 hover:border-white/25"
          >
            <div
              className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${tints[i % tints.length]} to-transparent opacity-70 blur-2xl`}
            />
            <div className="relative flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.18em] text-brand-cyan">
                {c.industry}
              </span>
              <span className="text-xs text-white/30 transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </div>
            <h2 className="relative mt-5 font-display text-2xl font-semibold transition-colors group-hover:text-brand-glow md:text-3xl">
              {c.client}
            </h2>
            <p className="relative mt-3 flex-1 text-sm leading-relaxed text-white/60">
              {c.result}
            </p>
            <div className="relative mt-6 flex flex-wrap gap-2">
              {c.services.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55"
                >
                  {s}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {rosterShown.length > 0 && (
        <div className="mt-14">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            More clients{filter !== 'All' ? ` — ${filter}` : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {rosterShown.map((c) => (
              <span
                key={c.name}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/65"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
