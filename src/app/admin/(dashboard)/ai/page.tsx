import Link from 'next/link';
import type { Metadata } from 'next';
import { getAiOverview } from '@/server/ai/analytics/queries';
import { getIndexStats } from '@/server/ai/retrieval/vector-store';
import { getAiConfig, isChatConfigured, isEmbeddingConfigured } from '@/server/ai/config';
import { requireUser } from '@/server/auth/rbac';
import { Card, PageHeader } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Elenor AI' };
export const dynamic = 'force-dynamic';

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-white/50">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-white/30">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/25"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">{body}</div>
  );
}

function formatMs(ms: number): string {
  if (ms === 0) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

/** Surfaces missing configuration rather than letting the widget fail silently. */
async function ConfigNotice() {
  const chatReady = isChatConfigured();
  const embeddingReady = isEmbeddingConfigured();
  if (chatReady && embeddingReady) return null;

  const missing = [
    !chatReady && 'a chat provider API key',
    !embeddingReady && 'an embedding provider API key',
  ].filter(Boolean);

  return (
    <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5">
      <h2 className="font-display font-semibold text-amber-100">Assistant not fully configured</h2>
      <p className="mt-1 text-sm text-amber-100/70">
        Elenor AI needs {missing.join(' and ')}. Add the values to your environment (see{' '}
        <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">docs/ai/README.md</code>) and
        redeploy. Until then the widget tells visitors the assistant is unavailable.
      </p>
    </div>
  );
}

export default async function AiOverviewPage() {
  await requireUser();

  const [overview, indexStats] = await Promise.all([
    getAiOverview().catch(() => null),
    getIndexStats().catch(() => null),
  ]);

  let providerLabel = 'Not configured';
  try {
    const config = getAiConfig();
    providerLabel = `${config.chat.provider} · ${config.chat.model}`;
  } catch {
    // Invalid provider id — the notice above already explains it.
  }

  if (!overview) {
    return (
      <div>
        <PageHeader title="Elenor AI" description="Assistant performance and knowledge health." />
        <Card>
          <p className="text-sm text-white/60">
            Analytics are unavailable — the AI tables may not be migrated yet. Run{' '}
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">npm run db:migrate</code>.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Elenor AI"
        description={`Assistant performance and knowledge health · ${providerLabel}`}
        actions={
          <div className="flex gap-3">
            <Link href="/admin/ai/conversations" className="text-xs text-brand-glow hover:underline">
              Conversations
            </Link>
            <Link href="/admin/ai/leads" className="text-xs text-brand-glow hover:underline">
              Leads
            </Link>
            <Link href="/admin/ai/knowledge" className="text-xs text-brand-glow hover:underline">
              Knowledge
            </Link>
          </div>
        }
      />

      <ConfigNotice />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat
          label="Conversations"
          value={overview.allTime.conversations}
          hint={`${overview.daily.conversations} today`}
          href="/admin/ai/conversations"
        />
        <Stat label="Active now" value={overview.activeChats} hint="last 15 min" />
        <Stat
          label="Leads captured"
          value={overview.allTime.leads}
          hint={`${overview.leadConversionRate}% of chats`}
          href="/admin/ai/leads"
        />
        <Stat
          label="Answered rate"
          value={`${overview.weekly.answeredRate}%`}
          hint="last 7 days"
        />
        <Stat
          label="Avg response"
          value={formatMs(overview.weekly.avgResponseMs)}
          hint="last 7 days"
        />
        <Stat
          label="Indexed chunks"
          value={indexStats?.totalChunks ?? 0}
          hint={indexStats?.usingPgVector ? 'pgvector' : 'array fallback'}
          href="/admin/ai/knowledge"
        />
      </div>

      {/* Period comparison */}
      <Card className="mt-6">
        <h2 className="font-display font-semibold">Activity</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                <th className="pb-2 font-medium">Period</th>
                <th className="pb-2 font-medium">Conversations</th>
                <th className="pb-2 font-medium">Questions</th>
                <th className="pb-2 font-medium">Leads</th>
                <th className="pb-2 font-medium">Answered</th>
                <th className="pb-2 font-medium">Avg time</th>
                <th className="pb-2 font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(
                [
                  ['Today', overview.daily],
                  ['Last 7 days', overview.weekly],
                  ['Last 30 days', overview.monthly],
                ] as const
              ).map(([label, stats]) => (
                <tr key={label}>
                  <td className="py-2.5 text-white/70">{label}</td>
                  <td className="py-2.5">{stats.conversations}</td>
                  <td className="py-2.5">{stats.messages}</td>
                  <td className="py-2.5">{stats.leads}</td>
                  <td className="py-2.5">{stats.answeredRate}%</td>
                  <td className="py-2.5">{formatMs(stats.avgResponseMs)}</td>
                  <td className="py-2.5 text-white/50">{stats.totalTokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display font-semibold">Top questions</h2>
          <p className="mt-1 text-xs text-white/40">Last 30 days</p>
          {overview.topQuestions.length === 0 ? (
            <p className="mt-4 text-sm text-white/40">No questions yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {overview.topQuestions.map((item) => (
                <li key={item.question} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-white/70">{item.question}</span>
                  <span className="shrink-0 text-white/40">
                    {item.asks}× · {item.answeredRate}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-display font-semibold">Content gaps</h2>
          <p className="mt-1 text-xs text-white/40">
            Questions the assistant could not answer — good candidates for new FAQ or service copy.
          </p>
          {overview.unansweredQuestions.length === 0 ? (
            <p className="mt-4 text-sm text-white/40">
              Nothing unanswered. The knowledge base is covering what visitors ask.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {overview.unansweredQuestions.map((item) => (
                <li key={item.question} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-amber-200/80">{item.question}</span>
                  <span className="shrink-0 text-white/40">{item.asks}×</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-display font-semibold">Most retrieved documents</h2>
        <p className="mt-1 text-xs text-white/40">
          Which knowledge sources the assistant leans on most.
        </p>
        {overview.topDocuments.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">No retrievals recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {overview.topDocuments.map((doc) => (
              <li
                key={`${doc.sourceType}:${doc.title}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-white/70">{doc.title}</span>
                <span className="shrink-0 text-xs text-white/35">{doc.sourceType}</span>
                <span className="shrink-0 text-white/40">{doc.uses}×</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
