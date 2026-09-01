import 'server-only';
import { and, avg, count, desc, eq, gte, ilike, or, sql, sum } from 'drizzle-orm';
import { db } from '@/db';
import { chatAnalytics, chatConversations, chatLeads, chatMessages, knowledgeChunks } from '@/db/schema';

/**
 * Read models for the admin AI section. Every function is uncached — admins
 * always see live numbers — and each tolerates an empty dataset so a freshly
 * deployed site renders zeros rather than crashing.
 */

function since(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function n(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type PeriodStats = {
  conversations: number;
  messages: number;
  leads: number;
  answeredRate: number;
  avgResponseMs: number;
  totalTokens: number;
};

async function statsForPeriod(days: number): Promise<PeriodStats> {
  const from = since(days);

  const [turns] = await db
    .select({
      total: count(),
      answered: sql<number>`COUNT(*) FILTER (WHERE ${chatAnalytics.wasAnswered})`,
      avgMs: avg(chatAnalytics.totalMs),
      inputTokens: sum(chatAnalytics.inputTokens),
      outputTokens: sum(chatAnalytics.outputTokens),
    })
    .from(chatAnalytics)
    .where(gte(chatAnalytics.createdAt, from));

  const [conversations] = await db
    .select({ n: count() })
    .from(chatConversations)
    .where(gte(chatConversations.createdAt, from));

  const [leads] = await db
    .select({ n: count() })
    .from(chatLeads)
    .where(gte(chatLeads.createdAt, from));

  const total = n(turns?.total);
  return {
    conversations: n(conversations?.n),
    messages: total,
    leads: n(leads?.n),
    answeredRate: total > 0 ? Math.round((n(turns?.answered) / total) * 100) : 0,
    avgResponseMs: Math.round(n(turns?.avgMs)),
    totalTokens: n(turns?.inputTokens) + n(turns?.outputTokens),
  };
}

export type TopQuestion = { question: string; asks: number; answeredRate: number };
export type DocumentUsage = { title: string; sourceType: string; uses: number };

export type AiOverview = {
  daily: PeriodStats;
  weekly: PeriodStats;
  monthly: PeriodStats;
  allTime: { conversations: number; messages: number; leads: number };
  activeChats: number;
  topQuestions: TopQuestion[];
  unansweredQuestions: TopQuestion[];
  topDocuments: DocumentUsage[];
  leadConversionRate: number;
};

export async function getAiOverview(): Promise<AiOverview> {
  const [daily, weekly, monthly] = await Promise.all([
    statsForPeriod(1),
    statsForPeriod(7),
    statsForPeriod(30),
  ]);

  const [totals] = await db
    .select({
      conversations: count(),
    })
    .from(chatConversations);

  const [messageTotal] = await db.select({ n: count() }).from(chatMessages);
  const [leadTotal] = await db.select({ n: count() }).from(chatLeads);

  // "Active" = a conversation with activity in the last 15 minutes.
  const [active] = await db
    .select({ n: count() })
    .from(chatConversations)
    .where(gte(chatConversations.lastMessageAt, new Date(Date.now() - 15 * 60 * 1000)));

  const questionRows = await db
    .select({
      question: sql<string>`MIN(${chatAnalytics.question})`,
      key: chatAnalytics.questionKey,
      asks: count(),
      answered: sql<number>`COUNT(*) FILTER (WHERE ${chatAnalytics.wasAnswered})`,
    })
    .from(chatAnalytics)
    .where(gte(chatAnalytics.createdAt, since(30)))
    .groupBy(chatAnalytics.questionKey)
    .orderBy(desc(count()))
    .limit(10);

  const topQuestions: TopQuestion[] = questionRows.map((row) => ({
    question: row.question,
    asks: n(row.asks),
    answeredRate: n(row.asks) > 0 ? Math.round((n(row.answered) / n(row.asks)) * 100) : 0,
  }));

  // Questions the assistant could not answer — the content-gap report.
  const unansweredRows = await db
    .select({
      question: sql<string>`MIN(${chatAnalytics.question})`,
      key: chatAnalytics.questionKey,
      asks: count(),
    })
    .from(chatAnalytics)
    .where(and(gte(chatAnalytics.createdAt, since(30)), eq(chatAnalytics.wasAnswered, false)))
    .groupBy(chatAnalytics.questionKey)
    .orderBy(desc(count()))
    .limit(10);

  const unansweredQuestions: TopQuestion[] = unansweredRows.map((row) => ({
    question: row.question,
    asks: n(row.asks),
    answeredRate: 0,
  }));

  // Most-retrieved documents: unnest chunk ids, then resolve to titles.
  const documentRows = await db.execute<{
    title: string;
    source_type: string;
    uses: number | string;
  }>(sql`
    SELECT k.title, k.source_type, COUNT(*) AS uses
    FROM ${chatAnalytics} a
    CROSS JOIN LATERAL unnest(a.retrieved_chunk_ids) AS chunk_id
    JOIN ${knowledgeChunks} k ON k.id = chunk_id::uuid
    WHERE a.created_at >= ${since(30)}
    GROUP BY k.title, k.source_type
    ORDER BY uses DESC
    LIMIT 10
  `);

  const rows = Array.isArray(documentRows)
    ? documentRows
    : ((documentRows as { rows?: unknown[] }).rows ?? []);

  const topDocuments: DocumentUsage[] = (
    rows as { title: string; source_type: string; uses: number | string }[]
  ).map((row) => ({
    title: row.title,
    sourceType: row.source_type,
    uses: n(row.uses),
  }));

  const conversationTotal = n(totals?.conversations);
  return {
    daily,
    weekly,
    monthly,
    allTime: {
      conversations: conversationTotal,
      messages: n(messageTotal?.n),
      leads: n(leadTotal?.n),
    },
    activeChats: n(active?.n),
    topQuestions,
    unansweredQuestions,
    topDocuments,
    leadConversionRate:
      conversationTotal > 0 ? Math.round((n(leadTotal?.n) / conversationTotal) * 100) : 0,
  };
}

export type ConversationListItem = {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  isFlagged: boolean;
  lead: { name: string; email: string; score: number } | null;
};

export type ConversationFilters = {
  search?: string;
  from?: Date;
  to?: Date;
  /** Only conversations that produced a lead. */
  leadsOnly?: boolean;
  flaggedOnly?: boolean;
  limit?: number;
  offset?: number;
};

export async function listConversations(
  filters: ConversationFilters = {},
): Promise<{ items: ConversationListItem[]; total: number }> {
  const conditions = [];
  if (filters.from) conditions.push(gte(chatConversations.lastMessageAt, filters.from));
  if (filters.to) conditions.push(sql`${chatConversations.lastMessageAt} <= ${filters.to}`);
  if (filters.flaggedOnly) conditions.push(eq(chatConversations.isFlagged, true));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(chatConversations.title, term),
        sql`EXISTS (
          SELECT 1 FROM ${chatMessages} m
          WHERE m.conversation_id = ${chatConversations.id} AND m.content ILIKE ${term}
        )`,
      ),
    );
  }
  if (filters.leadsOnly) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${chatLeads} l WHERE l.conversation_id = ${chatConversations.id})`,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db.select({ n: count() }).from(chatConversations).where(where);

  const rows = await db
    .select({
      id: chatConversations.id,
      title: chatConversations.title,
      messageCount: chatConversations.messageCount,
      lastMessageAt: chatConversations.lastMessageAt,
      createdAt: chatConversations.createdAt,
      isFlagged: chatConversations.isFlagged,
      leadName: chatLeads.name,
      leadEmail: chatLeads.email,
      leadScore: chatLeads.score,
    })
    .from(chatConversations)
    .leftJoin(chatLeads, eq(chatLeads.conversationId, chatConversations.id))
    .where(where)
    .orderBy(desc(chatConversations.lastMessageAt))
    .limit(filters.limit ?? 25)
    .offset(filters.offset ?? 0);

  return {
    total: n(totalRow?.n),
    items: rows.map((row) => ({
      id: row.id,
      title: row.title || 'Untitled conversation',
      messageCount: row.messageCount,
      lastMessageAt: row.lastMessageAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      isFlagged: row.isFlagged,
      lead:
        row.leadScore !== null
          ? { name: row.leadName ?? '', email: row.leadEmail ?? '', score: row.leadScore }
          : null,
    })),
  };
}

export async function getConversationDetail(id: string) {
  const conversation = await db.query.chatConversations.findFirst({
    where: eq(chatConversations.id, id),
    with: {
      messages: { orderBy: (m, { asc }) => [asc(m.createdAt)] },
      lead: true,
    },
  });
  return conversation ?? null;
}

export type LeadListItem = {
  id: string;
  conversationId: string;
  name: string;
  email: string;
  company: string;
  score: number;
  status: string;
  servicesInterested: string[];
  budget: string;
  createdAt: string;
};

export async function listLeads(limit = 50): Promise<LeadListItem[]> {
  const rows = await db
    .select()
    .from(chatLeads)
    .orderBy(desc(chatLeads.score), desc(chatLeads.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    name: row.name,
    email: row.email,
    company: row.company,
    score: row.score,
    status: row.status,
    servicesInterested: row.servicesInterested,
    budget: row.budget,
    createdAt: row.createdAt.toISOString(),
  }));
}
