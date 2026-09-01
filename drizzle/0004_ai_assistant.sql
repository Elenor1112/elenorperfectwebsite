-- Elenor AI — knowledge index, conversations, leads and analytics.
--
-- The embedding column is created as pgvector's `vector(1536)` when the
-- extension is installable (Neon, or any Postgres with pgvector), and as a
-- plain `real[]` otherwise so local dev on a stock `postgres:16` container
-- still works. Everything above src/server/ai/retrieval/vector-store.ts is
-- agnostic to which of the two is live; the store probes at runtime.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector unavailable (%), knowledge_chunks.embedding will use real[]', SQLERRM;
END
$$;--> statement-breakpoint

DO $$
DECLARE
  has_vector boolean := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector');
  -- Must match AI_EMBEDDING_DIMENSIONS. Defaults to 1536 (OpenAI
  -- text-embedding-3-small); Gemini's text-embedding-004 is 768. Override per
  -- database with: ALTER DATABASE <db> SET app.embedding_dimensions = '768';
  dims text := COALESCE(current_setting('app.embedding_dimensions', true), '1536');
BEGIN
  EXECUTE format($fmt$
    CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "source_type" text NOT NULL,
      "source_id" text NOT NULL,
      "title" text NOT NULL,
      "slug" text DEFAULT '' NOT NULL,
      "content" text NOT NULL,
      "embedding" %s NOT NULL,
      "metadata" jsonb NOT NULL,
      "content_hash" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  $fmt$, CASE WHEN has_vector THEN format('vector(%s)', dims) ELSE 'real[]' END);

  -- ANN index only exists on the pgvector path; the array fallback does an
  -- exact scan, which is fine at this corpus size (a few thousand chunks).
  IF has_vector THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_idx" '
         || 'ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops)';
  END IF;
END
$$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "knowledge_chunks_source_idx" ON "knowledge_chunks" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_chunks_source_chunk_unique" ON "knowledge_chunks" USING btree ("source_type","source_id",("metadata" ->> 'chunkIndex'));--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_key" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"referrer" text DEFAULT '' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"internal_note" text DEFAULT '' NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"provider" text DEFAULT '' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"retrieval_ms" integer DEFAULT 0 NOT NULL,
	"llm_ms" integer DEFAULT 0 NOT NULL,
	"was_unanswered" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chat_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"industry" text DEFAULT '' NOT NULL,
	"project_summary" text DEFAULT '' NOT NULL,
	"budget" text DEFAULT '' NOT NULL,
	"timeline" text DEFAULT '' NOT NULL,
	"services_interested" text[] DEFAULT '{}' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"score_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"internal_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chat_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"question" text NOT NULL,
	"question_key" text NOT NULL,
	"provider" text DEFAULT '' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"retrieval_ms" integer DEFAULT 0 NOT NULL,
	"llm_ms" integer DEFAULT 0 NOT NULL,
	"total_ms" integer DEFAULT 0 NOT NULL,
	"retrieved_count" integer DEFAULT 0 NOT NULL,
	"top_score" real DEFAULT 0 NOT NULL,
	"retrieved_chunk_ids" text[] DEFAULT '{}' NOT NULL,
	"error_code" text DEFAULT '' NOT NULL,
	"was_answered" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_leads" ADD CONSTRAINT "chat_leads_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_analytics" ADD CONSTRAINT "chat_analytics_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "chat_conversations_session_idx" ON "chat_conversations" USING btree ("session_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversations_last_message_idx" ON "chat_conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_idx" ON "chat_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_leads_conversation_unique" ON "chat_leads" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_leads_score_idx" ON "chat_leads" USING btree ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_leads_status_idx" ON "chat_leads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_analytics_created_idx" ON "chat_analytics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_analytics_question_key_idx" ON "chat_analytics" USING btree ("question_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_analytics_answered_idx" ON "chat_analytics" USING btree ("was_answered","created_at");
