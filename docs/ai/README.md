# Elenor AI

A retrieval-augmented assistant built into the Elenor Marketing site. It answers
visitor questions using **only** published CMS content, streams responses, and
quietly captures leads from the conversation.

- **Phase 1** — floating chat widget, RAG pipeline, automatic indexing.
- **Phase 2** — server-side conversation persistence, lead detection and
  scoring, admin analytics.

---

## Contents

1. [Architecture](#architecture)
2. [Folder structure](#folder-structure)
3. [Environment variables](#environment-variables)
4. [Provider setup](#provider-setup)
5. [How indexing works](#how-indexing-works)
6. [The prompt pipeline](#the-prompt-pipeline)
7. [How conversations work](#how-conversations-work)
8. [Leads and scoring](#leads-and-scoring)
9. [Guardrails and security](#guardrails-and-security)
10. [Admin surface](#admin-surface)
11. [Deployment](#deployment)
12. [Testing](#testing)
13. [Troubleshooting](#troubleshooting)

---

## Architecture

```
Visitor question
      │
      ▼
POST /api/ai/chat ──── Zod validation · rate limit · session cookie
      │
      ▼
runChatTurn()  (src/server/ai/chat/chat-service.ts)
      │
      ├─ 1. Guardrails      screenUserMessage()      → blocks extraction attempts
      ├─ 2. Retrieval       retrieveContext()        → embed query, vector search
      ├─ 3. Prompt          buildPrompt()            → identity + rules + context
      ├─ 4. Generation      provider.streamChat()    → SSE deltas to the browser
      └─ 5. Telemetry       conversation-store.ts    → messages, leads, analytics
```

Two design rules hold the system together:

**Retrieval is the only source of truth.** The model never answers from its own
knowledge. When retrieval returns nothing above the similarity floor, the
service short-circuits and returns the fixed "I don't have that information"
sentence *without calling the model at all* — so there is no opportunity to
hallucinate.

**Every external dependency sits behind an interface.** Providers implement
`ChatProvider` / `EmbeddingProvider`; storage sits behind the `VectorStore`
functions. Swapping Anthropic for Gemini, or Postgres for a dedicated vector
database, touches one file each.

---

## Folder structure

```
src/server/ai/
├── config.ts                  All AI env vars, read in exactly one place
├── providers/
│   ├── types.ts               ChatProvider / EmbeddingProvider contracts, SSE reader
│   ├── anthropic.ts           Claude Messages API
│   ├── openai-compatible.ts   OpenAI + OpenRouter (same wire format)
│   ├── gemini.ts              Google Generative Language API
│   └── index.ts               Registry — id → implementation
├── indexing/
│   ├── chunker.ts             Pure word-window chunker with overlap
│   ├── embedding-service.ts   Batching, retry, content hashing
│   ├── sources.ts             CMS rows → flat documents
│   ├── indexer.ts             Orchestration, skip-if-unchanged
│   └── cms-hook.ts            Bridge from revalidate.ts (dynamic import)
├── retrieval/
│   ├── vector-store.ts        The ONLY module that knows how vectors are stored
│   └── retriever.ts           Query → embedding → ranked chunks
├── prompt/
│   ├── identity.ts            Segment 1 — who the assistant is
│   ├── rules.ts               Segment 2 — behavioural rules
│   ├── context.ts             Segment 3 — retrieved documents
│   ├── guardrails.ts          Input screening + delimiter neutralisation
│   └── builder.ts             Composes the segments
├── chat/
│   ├── chat-service.ts        Turn orchestration (the core)
│   ├── conversation-store.ts  Persistence (best-effort)
│   ├── session.ts             Anonymous visitor identity
│   └── rate-limit.ts          Fixed-window limiter
├── leads/
│   ├── extractor.ts           Pattern-based extraction (pure)
│   └── scoring.ts             Transparent 0–100 scoring (pure)
├── analytics/queries.ts       Read models for the admin dashboards
└── __tests__/                 105 tests, no network or database required

src/components/chat/           Widget (lazy-loaded), markdown renderer, state hook
src/app/api/ai/                Chat route + CSV exports
src/app/admin/(dashboard)/ai/  Overview, conversations, leads, knowledge
```

---

## Environment variables

Only `AI_CHAT_PROVIDER` and its API key are required. Everything else has a
working default.

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_CHAT_PROVIDER` | `anthropic` | `anthropic` \| `openai` \| `openrouter` \| `gemini` |
| `AI_CHAT_MODEL` | per provider | Overrides the default model |
| `AI_CHAT_BASE_URL` | per provider | For proxies or self-hosted gateways |
| `ANTHROPIC_API_KEY` | — | Required when the chat provider is `anthropic` |
| `OPENAI_API_KEY` | — | Required for `openai` (chat and/or embeddings) |
| `OPENROUTER_API_KEY` | — | Required for `openrouter` |
| `GEMINI_API_KEY` | — | Required for `gemini` |
| `AI_EMBEDDING_PROVIDER` | `openai` | `openai` \| `gemini` \| `openrouter` |
| `AI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `AI_EMBEDDING_DIMENSIONS` | `1536` | **Must match the migration's `vector(N)`** |
| `AI_MAX_CHUNKS` | `6` | Chunks retrieved per question |
| `AI_MIN_SCORE` | `0.25` | Cosine similarity floor |
| `AI_CHUNK_WORDS` | `500` | Target chunk size |
| `AI_CHUNK_OVERLAP_WORDS` | `100` | Overlap between chunks (capped at half the chunk) |
| `AI_MAX_HISTORY_MESSAGES` | `20` | Conversation memory cap |
| `AI_MAX_QUESTION_CHARS` | `2000` | Rejects longer questions |
| `AI_MAX_OUTPUT_TOKENS` | `1024` | Per-answer ceiling |
| `AI_RATE_LIMIT_REQUESTS` | `20` | Requests per window per client |
| `AI_RATE_LIMIT_WINDOW_MS` | `60000` | Window length |
| `AI_PGVECTOR` | auto | Set to `off` to force the array fallback |

> **Anthropic has no embeddings endpoint.** The default configuration therefore
> uses Claude for chat and OpenAI for embeddings, which needs both keys. To run
> on a single key, set `AI_CHAT_PROVIDER=openai` (or `gemini`).

---

## Provider setup

Switching providers is an environment change; no code changes.

**Anthropic (default) + OpenAI embeddings**

```bash
AI_CHAT_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

**OpenAI only (single key)**

```bash
AI_CHAT_PROVIDER=openai
AI_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

**OpenRouter (many models, one key)**

```bash
AI_CHAT_PROVIDER=openrouter
AI_CHAT_MODEL=anthropic/claude-opus-5
OPENROUTER_API_KEY=sk-or-...
AI_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

**Google Gemini only (single key)**

```bash
AI_CHAT_PROVIDER=gemini
AI_EMBEDDING_PROVIDER=gemini
AI_EMBEDDING_MODEL=text-embedding-004
AI_EMBEDDING_DIMENSIONS=768   # then re-run the migration and reindex
GEMINI_API_KEY=...
```

### Adding a new provider

1. Implement `ChatProvider` and/or `EmbeddingProvider` in `providers/`.
2. Add the id to the union in `config.ts` and a case in `providers/index.ts`.

No other file changes.

---

## How indexing works

```
CMS content → sources.ts → chunker.ts → embedding-service.ts → vector-store.ts
```

**Sources** (`indexing/sources.ts`) read through the public data layer
(`src/lib/data/*`), which already filters to published rows. Unpublished drafts
are therefore *structurally* unreachable rather than filtered by a check the
indexer could forget. Indexed sources: pages (home, about), services, case
studies, blog posts, FAQs, testimonials, and company settings.

**Chunking** uses ~500-word windows with ~100 words of overlap, preferring
paragraph boundaries in the last quarter of a window. Every chunk after the
first is prefixed with its document title so it retrieves well standalone.

**Change detection** hashes each document (SHA-256 of title + content). If the
hash matches what is stored, the document is skipped and costs no tokens.

**Automatic sync.** `src/lib/revalidate.ts` is called by every CMS server action
after a successful mutation; each helper now also schedules a targeted reindex
through `indexing/cms-hook.ts`. It is deliberately fire-and-forget — an editor's
save never blocks on embedding latency, and a failure self-heals on the next
save or via the admin rebuild button.

**Manual rebuild:** `npm run ai:index` (add `-- --force` to re-embed
everything), or **Admin → Elenor AI → Knowledge → Rebuild knowledge**.

### Vector storage

The migration creates `knowledge_chunks.embedding` as `vector(1536)` when
pgvector is installable (Neon, and any Postgres with the extension), and as
`real[]` otherwise, so a stock `postgres:16` dev container still works.
`vector-store.ts` probes `pg_extension` once per process and emits the matching
SQL: an HNSW-indexed `<=>` cosine search on the pgvector path, or exact cosine
arithmetic over the array on the fallback. Nothing above that module changes.

The fallback does a sequential scan. That is fine for a marketing-site corpus
(a few thousand chunks); for materially more, use pgvector.

---

## The prompt pipeline

Assembled by `prompt/builder.ts` in the order the spec requires:

```
System Identity  → prompt/identity.ts   Who the assistant is, voice, formatting
Company Rules    → prompt/rules.ts      Grounding, scope, confidentiality
Retrieved Docs   → prompt/context.ts    Numbered <document> blocks
Conversation     → message array        Trimmed to the history cap
Current Question → final user message
```

The first three become the system prompt; the last two become the provider's
message array. The builder is pure and free of `server-only`, so the whole
pipeline is unit-tested without a network or database.

---

## How conversations work

**Identity.** On the first message the server mints a random token, sets it as
an `HttpOnly` `elenor_chat_session` cookie (90 days), and stores only its
SHA-256 — mirroring the admin session design, so a database leak cannot be
replayed as somebody's chat session.

**Two layers of memory.**

- *Client* — the widget mirrors the last 20 messages into `localStorage` so the
  transcript survives a refresh even before the server has a conversation.
- *Server* — `chat_conversations` / `chat_messages` persist the same thread, so
  a returning visitor resumes where they left off on any page.

The server copy always wins. The client's history is only used as a hint when
the server has nothing stored, so a tampered payload cannot rewrite what the
assistant believes was said.

**Failure policy.** Persistence is best-effort: every write goes through
`safely()`, so if the database is unreachable the assistant still answers — it
just doesn't remember. Provider failures retry **once** when nothing has been
streamed yet (retrying mid-stream would duplicate visible text), then degrade to
a friendly message. The turn generator never throws for provider problems.

---

## Leads and scoring

Extraction (`leads/extractor.ts`) runs on the visitor's **own messages only** —
never on assistant output — so the model cannot hallucinate a lead into
existence. It is pattern-based rather than LLM-based so it adds no latency to
the response, costs nothing, and is auditable.

Captured: name, email, phone, company, website, industry, budget, timeline,
services of interest, and a project summary. Values merge across turns; a
previously captured value is never overwritten with nothing.

Scoring (`leads/scoring.ts`) is a transparent 0–100 rubric. Every point is
attributed to a named factor and stored in `score_breakdown`, so the admin UI
can show *why* a lead ranks where it does. Contact reachability outweighs a
detailed brief — a long anonymous message the team cannot follow up on is worth
less than a short one with an email address. Bands: **hot** ≥ 60, **warm** ≥ 30.

The assistant is never told to ask for details. Collection is passive.

---

## Guardrails and security

| Concern | Mitigation |
| --- | --- |
| Hallucination | Retrieval-only grounding; zero hits short-circuits before the model runs |
| Unpublished content | Sources read the public data layer, which filters to published rows |
| Prompt extraction | `screenUserMessage()` blocks blatant attempts pre-token; rules refuse the rest |
| Prompt injection via content | Retrieved chunks are wrapped in `<document>` tags and marked as data; delimiters neutralised |
| XSS | The markdown renderer emits a React tree — `dangerouslySetInnerHTML` is never used |
| Malicious links | Only `http(s)`, relative, `mailto:` and `tel:` survive; everything else renders as text |
| Abuse | Fixed-window rate limit per IP + session |
| Injection (SQL) | Drizzle parameterises every query, including the raw vector SQL |
| CSV injection | Export cells starting `= + - @` are prefixed with a quote |
| Out-of-scope advice | Rules refuse legal, medical, and financial questions |
| PII in logs | Analytics store the question text and timings — never IP or user agent |

The layered order matters: cheap input screening first, then the structural
guarantee (no context → no model call), then the prompt rules as the final net.

---

## Admin surface

**Admin → Elenor AI**

- **Overview** — conversations, active chats, leads, answered rate, average
  response time, token spend, daily/weekly/monthly comparison, top questions,
  **content gaps** (questions the assistant could not answer — the most
  actionable report on the page), and most-retrieved documents.
- **Conversations** — search across message text, filter by date, leads-only or
  flagged; open a transcript with the retrieval trace and per-turn timings;
  add internal notes, flag, delete, export CSV.
- **Leads** — score-ranked table with services, budget, and status; CSV export.
- **Knowledge** — indexed documents and chunks per source, last-indexed times,
  index health, **missing documents**, and a rebuild button.

---

## Deployment

1. **Migrate** — `npm run db:migrate`. Migration `0004_ai_assistant` enables
   pgvector when available and falls back to `real[]` otherwise.
2. **Set environment variables** — at minimum a chat provider key and an
   embedding provider key (see above). Add them in Vercel → Settings →
   Environment Variables.
3. **Build the index** — `npm run ai:index`, or click **Rebuild knowledge** in
   the admin. Required once: the widget cannot answer anything before the index
   exists.
4. **Verify** — open the site, click the launcher, ask "What services do you
   offer?" A grounded answer with source chips means the pipeline is healthy.

The chat route runs on the Node runtime (`runtime = 'nodejs'`) because it uses
the Postgres driver and `crypto`.

### Cost control

- Re-indexing only embeds changed documents.
- Zero-hit questions never reach the chat model.
- `AI_MAX_CHUNKS` and `AI_MAX_OUTPUT_TOKENS` bound the per-question spend.
- Token usage per turn is recorded in `chat_analytics`.

---

## Testing

```bash
npm test          # 105 tests, 20 suites — no network, no database
npx tsc --noEmit  # type check
```

Covered: chunking (sizing, overlap, boundary snapping, degenerate inputs),
content hashing, prompt assembly and ordering, guardrail screening
(block/allow/injection), markdown safety (XSS, `javascript:`, `data:`), lead
extraction and merging, scoring rubric and bands, rate limiting, SSE parsing,
and all four provider adapters against a stubbed `fetch` — including that the
Anthropic request omits `temperature`, `top_p`, and `thinking`, which current
Claude models reject with a 400.

Tests import `server-only` modules through a stub installed in
`__tests__/setup.ts`, so the production guard stays intact.

---

## Troubleshooting

**"The assistant is not configured yet."**
No chat provider API key. Check `AI_CHAT_PROVIDER` and the matching key.

**Every answer is "I don't currently have that information."**
The index is empty or retrieval is failing. Open **Admin → Elenor AI →
Knowledge**: if *Stored chunks* is 0, run `npm run ai:index`. If chunks exist,
lower `AI_MIN_SCORE` (try `0.2`) — an overly strict floor rejects valid matches.

**Answers ignore content I just published.**
Auto-indexing runs in the background and takes a few seconds. If it never
lands, check the server logs for `[elenor-ai]` and confirm the embedding key is
set — indexing silently no-ops without one. Force it with **Rebuild knowledge**.

**`operator does not exist: real[] <=> unknown`**
The database has no pgvector but a `vector` query was emitted. Restart the
process (the mode is probed once per process) or set `AI_PGVECTOR=off`.

**Embedding dimension mismatch on insert**
`AI_EMBEDDING_DIMENSIONS` no longer matches the column. Changing the embedding
model usually changes its dimension: update the column and re-run
`npm run ai:index -- --force`.

**Widget does not appear**
It lazy-loads on idle or first interaction. If it never appears, check the
browser console — it renders only on the public `(site)` routes, not `/admin`.

**429 responses during testing**
The rate limit is 20 requests/minute per IP+session. Raise
`AI_RATE_LIMIT_REQUESTS` or wait for the window.

**Rate limiting seems ineffective in production**
The limiter is in-memory and therefore per-instance; a serverless deployment
runs several. For a hard global cap, replace `chat/rate-limit.ts` with a Redis
counter behind the same signature.
