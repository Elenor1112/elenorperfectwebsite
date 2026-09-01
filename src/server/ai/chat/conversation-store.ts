import 'server-only';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  chatAnalytics,
  chatConversations,
  chatLeads,
  chatMessages,
  type RetrievedSource,
} from '@/db/schema';
import { extractLead, hasLeadSignal, mergeLead, type ExtractedLead } from '../leads/extractor';
import { scoreLead } from '../leads/scoring';
import type { TurnSummary } from './chat-service';

/**
 * Persistence for chat. All writes are best-effort: a logging or lead-capture
 * failure must never break the visitor's conversation, so callers invoke these
 * through `safely()` and the errors surface only in server logs.
 */

export async function safely<T>(operation: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error(`[elenor-ai] ${label} failed:`, error);
    return null;
  }
}

/** Finds the visitor's active conversation, creating one on first message. */
export async function getOrCreateConversation(
  sessionKey: string,
  meta: { referrer?: string } = {},
): Promise<string> {
  const existing = await db.query.chatConversations.findFirst({
    where: and(
      eq(chatConversations.sessionKey, sessionKey),
      eq(chatConversations.status, 'active'),
    ),
    orderBy: [desc(chatConversations.lastMessageAt)],
    columns: { id: true },
  });
  if (existing) return existing.id;

  const [row] = await db
    .insert(chatConversations)
    .values({ sessionKey, referrer: meta.referrer ?? '' })
    .returning({ id: chatConversations.id });
  return row.id;
}

/** Prior turns for a returning visitor, oldest first. */
export async function loadConversationHistory(
  conversationId: string,
  limit: number,
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const rows = await db.query.chatMessages.findMany({
    where: eq(chatMessages.conversationId, conversationId),
    orderBy: [desc(chatMessages.createdAt)],
    limit,
    columns: { role: true, content: true },
  });
  return rows.reverse().map((row) => ({ role: row.role, content: row.content }));
}

export async function recordUserMessage(
  conversationId: string,
  content: string,
): Promise<void> {
  await db.insert(chatMessages).values({ conversationId, role: 'user', content });
  await db
    .update(chatConversations)
    .set({
      messageCount: sql`${chatConversations.messageCount} + 1`,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      // The first question makes a serviceable conversation title.
      title: sql`CASE WHEN ${chatConversations.title} = '' THEN ${content.slice(0, 120)} ELSE ${chatConversations.title} END`,
    })
    .where(eq(chatConversations.id, conversationId));
}

export async function recordAssistantMessage(
  conversationId: string,
  summary: TurnSummary,
): Promise<void> {
  await db.insert(chatMessages).values({
    conversationId,
    role: 'assistant',
    content: summary.answer,
    sources: summary.sources as RetrievedSource[],
    provider: summary.provider,
    model: summary.model,
    inputTokens: summary.inputTokens,
    outputTokens: summary.outputTokens,
    retrievalMs: summary.retrievalMs,
    llmMs: summary.llmMs,
    wasUnanswered: summary.unanswered,
  });
  await db
    .update(chatConversations)
    .set({
      messageCount: sql`${chatConversations.messageCount} + 1`,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(chatConversations.id, conversationId));
}

/** Normalises a question for "top questions" grouping. */
function questionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export async function recordAnalytics(
  conversationId: string | null,
  question: string,
  summary: TurnSummary,
): Promise<void> {
  await db.insert(chatAnalytics).values({
    conversationId,
    question: question.slice(0, 1000),
    questionKey: questionKey(question),
    provider: summary.provider,
    model: summary.model,
    inputTokens: summary.inputTokens,
    outputTokens: summary.outputTokens,
    retrievalMs: summary.retrievalMs,
    llmMs: summary.llmMs,
    totalMs: summary.totalMs,
    retrievedCount: summary.sources.length,
    topScore: summary.topScore,
    retrievedChunkIds: summary.retrievedChunkIds,
    errorCode: summary.errorCode,
    wasAnswered: !summary.unanswered,
  });
}

/** Row shape for reading a lead back out of the database. */
function toExtracted(row: typeof chatLeads.$inferSelect): ExtractedLead {
  return {
    name: row.name || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    company: row.company || undefined,
    website: row.website || undefined,
    industry: row.industry || undefined,
    budget: row.budget || undefined,
    timeline: row.timeline || undefined,
    projectSummary: row.projectSummary || undefined,
    servicesInterested: row.servicesInterested.length > 0 ? row.servicesInterested : undefined,
  };
}

/**
 * Re-derives the lead from the visitor's messages and upserts it.
 *
 * Runs over the whole conversation rather than the latest turn so details
 * mentioned early (a budget, a company) survive even if the newest message
 * contains none — and so re-scoring always reflects everything known.
 */
export async function syncLead(conversationId: string): Promise<void> {
  const userMessages = await db.query.chatMessages.findMany({
    where: and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.role, 'user')),
    orderBy: [asc(chatMessages.createdAt)],
    columns: { content: true },
  });
  if (userMessages.length === 0) return;

  const detected = extractLead(userMessages.map((m) => m.content));

  const existingRow = await db.query.chatLeads.findFirst({
    where: eq(chatLeads.conversationId, conversationId),
  });

  // Nothing worth storing yet, and nothing stored before.
  if (!existingRow && !hasLeadSignal(detected)) return;

  const merged = existingRow ? mergeLead(toExtracted(existingRow), detected) : detected;
  const { score, breakdown } = scoreLead(merged);

  const values = {
    name: merged.name ?? '',
    email: merged.email ?? '',
    phone: merged.phone ?? '',
    company: merged.company ?? '',
    website: merged.website ?? '',
    industry: merged.industry ?? '',
    projectSummary: merged.projectSummary ?? '',
    budget: merged.budget ?? '',
    timeline: merged.timeline ?? '',
    servicesInterested: merged.servicesInterested ?? [],
    score,
    scoreBreakdown: breakdown,
    updatedAt: new Date(),
  };

  if (existingRow) {
    await db.update(chatLeads).set(values).where(eq(chatLeads.id, existingRow.id));
  } else {
    await db.insert(chatLeads).values({ conversationId, ...values });
  }
}
