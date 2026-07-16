'use client';

// Search + filter toolbar for admin list pages. State lives in the URL
// (searchParams) so lists are server-rendered, shareable, and paginate on the
// server — fast even with hundreds of rows.

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Input, Select } from './ui';

export function ListToolbar({
  searchPlaceholder = 'Search…',
  filters = [],
}: {
  searchPlaceholder?: string;
  filters?: { name: string; label: string; options: { value: string; label: string }[] }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const first = useRef(true);

  // Debounced search → URL (?q=...&page reset).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set('q', q);
      else next.delete('q');
      next.delete('page');
      router.replace(`${pathname}?${next.toString()}`);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setFilter = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('page');
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={searchPlaceholder}
        className="max-w-xs"
        aria-label="Search"
      />
      {filters.map((f) => (
        <Select
          key={f.name}
          value={params.get(f.name) ?? ''}
          onChange={(e) => setFilter(f.name, e.target.value)}
          className="w-auto min-w-[140px]"
          aria-label={f.label}
        >
          <option value="">{f.label}: all</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (totalPages <= 1) return null;

  const go = (p: number) => {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete('page');
    else next.set('page', String(p));
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="mt-6 flex items-center justify-between text-sm text-white/50">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className="rounded-lg border border-white/15 px-3 py-1.5 transition hover:border-white/40 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          className="rounded-lg border border-white/15 px-3 py-1.5 transition hover:border-white/40 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
