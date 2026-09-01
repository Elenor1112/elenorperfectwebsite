import Link from 'next/link';
import type { Metadata } from 'next';
import { listLeads } from '@/server/ai/analytics/queries';
import { scoreBand } from '@/server/ai/leads/scoring';
import { requireUser } from '@/server/auth/rbac';
import { Card, PageHeader } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'AI Leads' };
export const dynamic = 'force-dynamic';

const BAND_STYLES: Record<string, string> = {
  hot: 'bg-emerald-400/15 text-emerald-300',
  warm: 'bg-amber-400/15 text-amber-300',
  cool: 'bg-white/10 text-white/60',
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default async function LeadsPage() {
  await requireUser();
  const leads = await listLeads(100).catch(() => []);

  return (
    <div>
      <PageHeader
        title="Leads from chat"
        description="Contact details visitors shared with Elenor AI, scored by how ready they look."
        actions={
          <a href="/api/ai/leads/export" className="text-xs text-brand-glow hover:underline">
            Export CSV
          </a>
        }
      />

      {leads.length === 0 ? (
        <Card>
          <p className="text-sm text-white/50">
            No leads captured yet. They appear here automatically when a visitor shares contact
            details, a budget, or project requirements in chat.
          </p>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-6 py-3 font-medium">Score</th>
                  <th className="px-6 py-3 font-medium">Contact</th>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Interested in</th>
                  <th className="px-6 py-3 font-medium">Budget</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((lead) => (
                  <tr key={lead.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          BAND_STYLES[scoreBand(lead.score)]
                        }`}
                      >
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/admin/ai/conversations/${lead.conversationId}`}
                        className="block text-white/85 hover:text-brand-glow"
                      >
                        {lead.name || lead.email || 'Anonymous visitor'}
                      </Link>
                      {lead.email && lead.name ? (
                        <span className="text-xs text-white/40">{lead.email}</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-3.5 text-white/60">{lead.company || '—'}</td>
                    <td className="px-6 py-3.5 text-white/60">
                      {lead.servicesInterested.length > 0
                        ? lead.servicesInterested.join(', ')
                        : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-white/60">{lead.budget || '—'}</td>
                    <td className="px-6 py-3.5 capitalize text-white/60">{lead.status}</td>
                    <td className="px-6 py-3.5 text-white/40">{fmt(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
