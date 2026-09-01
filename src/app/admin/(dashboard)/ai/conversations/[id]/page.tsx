import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { getConversationDetail } from '@/server/ai/analytics/queries';
import { scoreBand } from '@/server/ai/leads/scoring';
import { requireUser } from '@/server/auth/rbac';
import { Card, PageHeader } from '@/components/admin/ui';
import { ConversationTools } from './ConversationTools';

export const metadata: Metadata = { title: 'Conversation' };
export const dynamic = 'force-dynamic';

const fmt = (date: Date) =>
  `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString(
    'en-US',
    { hour: 'numeric', minute: '2-digit' },
  )}`;

const BAND_STYLES: Record<string, string> = {
  hot: 'bg-emerald-400/15 text-emerald-300',
  warm: 'bg-amber-400/15 text-amber-300',
  cool: 'bg-white/10 text-white/60',
};

export default async function ConversationDetailPage({ params }: { params: { id: string } }) {
  await requireUser();

  const conversation = await getConversationDetail(params.id).catch(() => null);
  if (!conversation) notFound();

  const lead = conversation.lead;

  return (
    <div>
      <Link
        href="/admin/ai/conversations"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All conversations
      </Link>

      <PageHeader
        title={conversation.title || 'Untitled conversation'}
        description={`${conversation.messageCount} messages · started ${fmt(conversation.createdAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
        {/* Transcript */}
        <Card className="p-0">
          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
            {conversation.messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div key={message.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isUser ? 'bg-white/10 text-white/70' : 'bg-brand/25 text-brand-glow'
                    }`}
                  >
                    {isUser ? 'V' : <Sparkles className="h-3.5 w-3.5" />}
                  </span>

                  <div className={`min-w-0 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed ${
                        isUser
                          ? 'rounded-tr-sm bg-brand/12 text-white/85'
                          : 'rounded-tl-sm border border-white/10 bg-white/[0.03] text-white/80'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>

                    {/* Retrieval trace — which sources produced this answer. */}
                    {!isUser && message.sources.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {message.sources.map((source) => (
                          <span
                            key={source.chunkId}
                            className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40"
                            title={`${source.sourceType} · score ${source.score}`}
                          >
                            {source.title}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <p className="mt-1 text-[11px] text-white/30">
                      {fmt(message.createdAt)}
                      {!isUser && message.llmMs > 0
                        ? ` · ${message.retrievalMs}ms retrieval · ${message.llmMs}ms generation`
                        : ''}
                      {!isUser && message.outputTokens > 0
                        ? ` · ${message.inputTokens + message.outputTokens} tokens`
                        : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          {lead ? (
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display font-semibold">Lead</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                    BAND_STYLES[scoreBand(lead.score)]
                  }`}
                >
                  {lead.score}/100 · {scoreBand(lead.score)}
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                {(
                  [
                    ['Name', lead.name],
                    ['Email', lead.email],
                    ['Phone', lead.phone],
                    ['Company', lead.company],
                    ['Website', lead.website],
                    ['Industry', lead.industry],
                    ['Budget', lead.budget],
                    ['Timeline', lead.timeline],
                    ['Services', lead.servicesInterested.join(', ')],
                  ] as const
                )
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                      <dt className="w-24 shrink-0 text-white/40">{label}</dt>
                      <dd className="min-w-0 flex-1 break-words text-white/80">{value}</dd>
                    </div>
                  ))}
              </dl>

              {lead.scoreBreakdown.length > 0 ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-white/45 hover:text-white/70">
                    How this score was calculated
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {lead.scoreBreakdown.map((factor) => (
                      <li key={factor.factor} className="flex justify-between text-xs text-white/50">
                        <span>{factor.factor}</span>
                        <span className="text-white/70">+{factor.points}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </Card>
          ) : (
            <Card>
              <h2 className="font-display font-semibold">Lead</h2>
              <p className="mt-2 text-sm text-white/40">
                No contact details shared in this conversation yet.
              </p>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 font-display font-semibold">Admin</h2>
            <ConversationTools
              id={conversation.id}
              initialNote={conversation.internalNote}
              isFlagged={conversation.isFlagged}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
