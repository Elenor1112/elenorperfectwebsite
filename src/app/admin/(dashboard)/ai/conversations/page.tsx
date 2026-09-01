import Link from 'next/link';
import type { Metadata } from 'next';
import { Flag } from 'lucide-react';
import { listConversations } from '@/server/ai/analytics/queries';
import { requireUser } from '@/server/auth/rbac';
import { Card, PageHeader } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'AI Conversations' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const fmt = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString(
    'en-US',
    { hour: 'numeric', minute: '2-digit' },
  )}`;
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: { q?: string; from?: string; to?: string; leads?: string; flagged?: string; page?: string };
}) {
  await requireUser();

  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const { items, total } = await listConversations({
    search: searchParams.q?.trim() || undefined,
    from: parseDate(searchParams.from),
    to: parseDate(searchParams.to),
    leadsOnly: searchParams.leads === '1',
    flaggedOnly: searchParams.flagged === '1',
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }).catch(() => ({ items: [], total: 0 }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Conversations"
        description={`${total} conversation${total === 1 ? '' : 's'} with Elenor AI.`}
        actions={
          <a
            href={`/api/ai/conversations/export${searchParams.q ? `?q=${encodeURIComponent(searchParams.q)}` : ''}`}
            className="text-xs text-brand-glow hover:underline"
          >
            Export CSV
          </a>
        }
      />

      {/* Filters — a plain GET form keeps state in the URL and needs no client JS. */}
      <Card className="mb-6">
        <form method="get" className="grid gap-3 md:grid-cols-[2fr,1fr,1fr,auto]">
          <div>
            <label htmlFor="q" className="mb-1 block text-xs text-white/50">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={searchParams.q ?? ''}
              placeholder="Message text or title…"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-brand-glow/50 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="from" className="mb-1 block text-xs text-white/50">
              From
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={searchParams.from ?? ''}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-brand-glow/50 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="to" className="mb-1 block text-xs text-white/50">
              To
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={searchParams.to ?? ''}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-brand-glow/50 focus:outline-none"
            />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-1.5 text-xs text-white/60">
              <input
                type="checkbox"
                name="leads"
                value="1"
                defaultChecked={searchParams.leads === '1'}
                className="rounded border-white/20 bg-white/5"
              />
              Leads
            </label>
            <label className="flex items-center gap-1.5 text-xs text-white/60">
              <input
                type="checkbox"
                name="flagged"
                value="1"
                defaultChecked={searchParams.flagged === '1'}
                className="rounded border-white/20 bg-white/5"
              />
              Flagged
            </label>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-glow"
            >
              Filter
            </button>
          </div>
        </form>
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-white/50">No conversations match these filters yet.</p>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-white/5">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/ai/conversations/${item.id}`}
                  className="flex items-center gap-4 px-6 py-4 transition hover:bg-white/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm text-white/85">
                      {item.isFlagged ? (
                        <Flag className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                      ) : null}
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {item.messageCount} message{item.messageCount === 1 ? '' : 's'} ·{' '}
                      {fmt(item.lastMessageAt)}
                    </p>
                  </div>
                  {item.lead ? (
                    <span className="shrink-0 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] text-brand-glow">
                      Lead · {item.lead.score}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link
              href={{ query: { ...searchParams, page: page - 1 } }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-white/70 hover:border-white/30"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-white/40">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={{ query: { ...searchParams, page: page + 1 } }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-white/70 hover:border-white/30"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
