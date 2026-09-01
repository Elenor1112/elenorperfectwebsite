import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from './helpers';

/**
 * pgvector column with a graceful degradation path.
 *
 * Neon ships the `vector` extension; a plain `postgres:16` container usually
 * does not. Migration 0004 creates the extension when available and otherwise
 * falls back to `real[]`, which is why the SQL type is resolved at runtime from
 * an env flag rather than hard-coded. Both shapes accept the same JS value (a
 * number[]), so nothing above the VectorStore service has to care which one is
 * live — see src/server/ai/retrieval/vector-store.ts.
 */
export const EMBEDDING_DIMENSIONS = 1536;

/** Set by the migration/indexer when `CREATE EXTENSION vector` succeeded. */
export function pgVectorEnabled(): boolean {
  return process.env.AI_PGVECTOR !== 'off';
}

const embeddingColumn = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return pgVectorEnabled() ? `vector(${EMBEDDING_DIMENSIONS})` : 'real[]';
  },
  toDriver(value: number[]): string {
    // `[1,2,3]` is valid input for both pgvector and a Postgres real[] literal
    // (the latter accepts braces, but the array_in parser also accepts this
    // form via an explicit cast, which drizzle emits).
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    if (Array.isArray(value)) return value as unknown as number[];
    return JSON.parse(String(value).replace(/^\{/, '[').replace(/\}$/, ']')) as number[];
  },
});

/** Content types the knowledge indexer can ingest. Kept as text (not an enum)
 *  so adding a source needs no migration. */
export type KnowledgeSourceType =
  | 'page'
  | 'service'
  | 'case-study'
  | 'post'
  | 'faq'
  | 'testimonial'
  | 'settings';

export type ChunkMetadata = {
  /** Public URL of the source document, used for citations in the UI. */
  url: string | null;
  /** Section heading the chunk came from, when the source has sections. */
  section?: string;
  /** 0-based position of this chunk within its source document. */
  chunkIndex: number;
  totalChunks: number;
  /** Extra facets used for filtering/boosting (industries, categories, tags). */
  keywords?: string[];
};

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceType: text('source_type').$type<KnowledgeSourceType>().notNull(),
    /** UUID of the CMS row, or a stable synthetic key for settings-derived docs. */
    sourceId: text('source_id').notNull(),
    title: text('title').notNull(),
    slug: text('slug').default('').notNull(),
    content: text('content').notNull(),
    embedding: embeddingColumn('embedding').notNull(),
    metadata: jsonb('metadata').$type<ChunkMetadata>().notNull(),
    /** Hash of the source document, so unchanged content skips re-embedding. */
    contentHash: text('content_hash').notNull(),
    ...timestamps,
  },
  (t) => ({
    sourceIdx: index('knowledge_chunks_source_idx').on(t.sourceType, t.sourceId),
    sourceChunkUnique: uniqueIndex('knowledge_chunks_source_chunk_unique').on(
      t.sourceType,
      t.sourceId,
      sql`(${t.metadata} ->> 'chunkIndex')`,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Phase 2 — conversations, leads, analytics
// ---------------------------------------------------------------------------

export type ConversationStatus = 'active' | 'archived';

export const chatConversations = pgTable(
  'chat_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** SHA-256 of the anonymous visitor's session cookie. The raw token never
     *  reaches the database, so a DB leak can't be replayed as a session. */
    sessionKey: text('session_key').notNull(),
    title: text('title').default('').notNull(),
    status: text('status').$type<ConversationStatus>().default('active').notNull(),
    /** Coarse request context — no IP, no user agent (see docs/ai/README.md). */
    referrer: text('referrer').default('').notNull(),
    messageCount: integer('message_count').default(0).notNull(),
    /** Admin-only annotations. */
    internalNote: text('internal_note').default('').notNull(),
    isFlagged: boolean('is_flagged').default(false).notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow().notNull(),
    ...timestamps,
  },
  (t) => ({
    sessionIdx: index('chat_conversations_session_idx').on(t.sessionKey),
    lastMessageIdx: index('chat_conversations_last_message_idx').on(t.lastMessageAt),
  }),
);

export type ChatRole = 'user' | 'assistant';

/** Sources retrieved for an assistant turn, persisted for the admin viewer. */
export type RetrievedSource = {
  chunkId: string;
  title: string;
  url: string | null;
  sourceType: KnowledgeSourceType;
  score: number;
};

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    role: text('role').$type<ChatRole>().notNull(),
    content: text('content').notNull(),
    sources: jsonb('sources').$type<RetrievedSource[]>().default([]).notNull(),
    /** Null on user turns. */
    provider: text('provider').default('').notNull(),
    model: text('model').default('').notNull(),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    retrievalMs: integer('retrieval_ms').default(0).notNull(),
    llmMs: integer('llm_ms').default(0).notNull(),
    /** True when the assistant had no relevant context and said so. */
    wasUnanswered: boolean('was_unanswered').default(false).notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => ({
    conversationIdx: index('chat_messages_conversation_idx').on(t.conversationId, t.createdAt),
  }),
);

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

export const chatLeads = pgTable(
  'chat_leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    name: text('name').default('').notNull(),
    email: text('email').default('').notNull(),
    phone: text('phone').default('').notNull(),
    company: text('company').default('').notNull(),
    website: text('website').default('').notNull(),
    industry: text('industry').default('').notNull(),
    projectSummary: text('project_summary').default('').notNull(),
    budget: text('budget').default('').notNull(),
    timeline: text('timeline').default('').notNull(),
    servicesInterested: text('services_interested').array().default([]).notNull(),
    score: integer('score').default(0).notNull(),
    /** Per-factor breakdown so the score is auditable in the admin UI. */
    scoreBreakdown: jsonb('score_breakdown')
      .$type<{ factor: string; points: number }[]>()
      .default([])
      .notNull(),
    status: text('status').$type<LeadStatus>().default('new').notNull(),
    internalNote: text('internal_note').default('').notNull(),
    ...timestamps,
  },
  (t) => ({
    conversationUnique: uniqueIndex('chat_leads_conversation_unique').on(t.conversationId),
    scoreIdx: index('chat_leads_score_idx').on(t.score),
    statusIdx: index('chat_leads_status_idx').on(t.status, t.createdAt),
  }),
);

/** One row per assistant turn — the source table for every dashboard metric.
 *  Deliberately free of personal data: the question text is kept (it drives the
 *  "top questions" report) but never the visitor's identity. */
export const chatAnalytics = pgTable(
  'chat_analytics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').references(() => chatConversations.id, {
      onDelete: 'set null',
    }),
    question: text('question').notNull(),
    /** Normalised (lowercased, punctuation-stripped) for grouping. */
    questionKey: text('question_key').notNull(),
    provider: text('provider').default('').notNull(),
    model: text('model').default('').notNull(),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    retrievalMs: integer('retrieval_ms').default(0).notNull(),
    llmMs: integer('llm_ms').default(0).notNull(),
    totalMs: integer('total_ms').default(0).notNull(),
    /** Number of chunks that cleared the similarity floor. */
    retrievedCount: integer('retrieved_count').default(0).notNull(),
    topScore: real('top_score').default(0).notNull(),
    /** Chunk ids surfaced, for the "most viewed documents" report. */
    retrievedChunkIds: text('retrieved_chunk_ids').array().default([]).notNull(),
    /** '' when the turn succeeded, otherwise a short error code. */
    errorCode: text('error_code').default('').notNull(),
    wasAnswered: boolean('was_answered').default(true).notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => ({
    createdIdx: index('chat_analytics_created_idx').on(t.createdAt),
    questionKeyIdx: index('chat_analytics_question_key_idx').on(t.questionKey),
    answeredIdx: index('chat_analytics_answered_idx').on(t.wasAnswered, t.createdAt),
  }),
);

export const chatConversationsRelations = relations(chatConversations, ({ many, one }) => ({
  messages: many(chatMessages),
  lead: one(chatLeads, {
    fields: [chatConversations.id],
    references: [chatLeads.conversationId],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));

export const chatLeadsRelations = relations(chatLeads, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatLeads.conversationId],
    references: [chatConversations.id],
  }),
}));

export const chatAnalyticsRelations = relations(chatAnalytics, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatAnalytics.conversationId],
    references: [chatConversations.id],
  }),
}));
