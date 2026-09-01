import 'server-only';

/**
 * Every AI-related environment variable is read here and nowhere else, so
 * switching providers is a config change rather than a code change.
 */

export const CHAT_PROVIDERS = ['anthropic', 'openai', 'openrouter', 'gemini'] as const;
export type ChatProviderId = (typeof CHAT_PROVIDERS)[number];

/** Anthropic has no embeddings endpoint, so it is absent from this list. */
export const EMBEDDING_PROVIDERS = ['openai', 'gemini', 'openrouter'] as const;
export type EmbeddingProviderId = (typeof EMBEDDING_PROVIDERS)[number];

/** Model used when the operator does not pin one explicitly. */
const DEFAULT_CHAT_MODELS: Record<ChatProviderId, string> = {
  anthropic: 'claude-opus-5',
  openai: 'gpt-4o-mini',
  openrouter: 'anthropic/claude-opus-5',
  gemini: 'gemini-2.0-flash',
};

const DEFAULT_EMBEDDING_MODELS: Record<EmbeddingProviderId, string> = {
  openai: 'text-embedding-3-small',
  gemini: 'text-embedding-004',
  openrouter: 'openai/text-embedding-3-small',
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
};

/** Env var holding each provider's key. */
const API_KEY_VARS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

function isChatProvider(value: string): value is ChatProviderId {
  return (CHAT_PROVIDERS as readonly string[]).includes(value);
}

function isEmbeddingProvider(value: string): value is EmbeddingProviderId {
  return (EMBEDDING_PROVIDERS as readonly string[]).includes(value);
}

export type ProviderCredentials = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type AiConfig = {
  chat: { provider: ChatProviderId } & ProviderCredentials;
  embedding: { provider: EmbeddingProviderId } & ProviderCredentials & {
      dimensions: number;
    };
  /** Retrieval + generation tuning, overridable per deployment. */
  retrieval: {
    /**
     * `vector` embeds the query and does similarity search (best quality).
     * `keyword` uses Postgres full-text ranking and needs no embedding
     * provider — the escape hatch when no embeddings API is available.
     */
    mode: 'vector' | 'keyword';
    maxChunks: number;
    /** Cosine similarity floor; below this a chunk is treated as irrelevant. */
    minScore: number;
    chunkWords: number;
    chunkOverlapWords: number;
  };
  limits: {
    /** Max user+assistant messages kept in a single conversation. */
    maxHistoryMessages: number;
    maxQuestionChars: number;
    maxOutputTokens: number;
    /** Requests allowed per IP per window. */
    rateLimitRequests: number;
    rateLimitWindowMs: number;
  };
};

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Resolves configuration from the environment. Throws only when a *required*
 * key for the selected provider is missing — callers surface that as a
 * friendly "assistant unavailable" rather than a crash.
 */
export function getAiConfig(): AiConfig {
  const chatProviderRaw = process.env.AI_CHAT_PROVIDER ?? 'anthropic';
  if (!isChatProvider(chatProviderRaw)) {
    throw new Error(
      `AI_CHAT_PROVIDER="${chatProviderRaw}" is not supported. Use one of: ${CHAT_PROVIDERS.join(', ')}.`,
    );
  }

  const embeddingProviderRaw = process.env.AI_EMBEDDING_PROVIDER ?? 'openai';
  if (!isEmbeddingProvider(embeddingProviderRaw)) {
    throw new Error(
      `AI_EMBEDDING_PROVIDER="${embeddingProviderRaw}" is not supported. Use one of: ${EMBEDDING_PROVIDERS.join(', ')}. ` +
        'Anthropic does not offer an embeddings endpoint.',
    );
  }

  return {
    chat: {
      provider: chatProviderRaw,
      apiKey: process.env[API_KEY_VARS[chatProviderRaw]] ?? '',
      baseUrl: process.env.AI_CHAT_BASE_URL || DEFAULT_BASE_URLS[chatProviderRaw],
      model: process.env.AI_CHAT_MODEL || DEFAULT_CHAT_MODELS[chatProviderRaw],
    },
    embedding: {
      provider: embeddingProviderRaw,
      apiKey: process.env[API_KEY_VARS[embeddingProviderRaw]] ?? '',
      baseUrl: process.env.AI_EMBEDDING_BASE_URL || DEFAULT_BASE_URLS[embeddingProviderRaw],
      model: process.env.AI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODELS[embeddingProviderRaw],
      // Must match the migration's vector(N). Changing it requires a reindex.
      dimensions: num('AI_EMBEDDING_DIMENSIONS', 1536),
    },
    retrieval: {
      mode: process.env.AI_RETRIEVAL_MODE === 'keyword' ? 'keyword' : 'vector',
      maxChunks: num('AI_MAX_CHUNKS', 6),
      minScore: num('AI_MIN_SCORE', 0.25),
      chunkWords: num('AI_CHUNK_WORDS', 500),
      chunkOverlapWords: num('AI_CHUNK_OVERLAP_WORDS', 100),
    },
    limits: {
      maxHistoryMessages: num('AI_MAX_HISTORY_MESSAGES', 20),
      maxQuestionChars: num('AI_MAX_QUESTION_CHARS', 2000),
      maxOutputTokens: num('AI_MAX_OUTPUT_TOKENS', 1024),
      rateLimitRequests: num('AI_RATE_LIMIT_REQUESTS', 20),
      rateLimitWindowMs: num('AI_RATE_LIMIT_WINDOW_MS', 60_000),
    },
  };
}

/** True when the chat side has everything it needs to serve a request. */
export function isChatConfigured(): boolean {
  try {
    return getAiConfig().chat.apiKey.length > 0;
  } catch {
    return false;
  }
}

/**
 * True when the indexer can run. In keyword mode that needs no API key at all,
 * because chunks are stored without embeddings.
 */
export function isEmbeddingConfigured(): boolean {
  try {
    const config = getAiConfig();
    if (config.retrieval.mode === 'keyword') return true;
    return config.embedding.apiKey.length > 0;
  } catch {
    return false;
  }
}
