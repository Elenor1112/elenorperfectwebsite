import 'server-only';
import { getAiConfig, type ChatProviderId, type EmbeddingProviderId } from '../config';
import { AnthropicChatProvider } from './anthropic';
import { GeminiChatProvider, GeminiEmbeddingProvider } from './gemini';
import {
  OpenAiCompatibleChatProvider,
  OpenAiCompatibleEmbeddingProvider,
} from './openai-compatible';
import { AiProviderError, type ChatProvider, type EmbeddingProvider } from './types';

export * from './types';

/**
 * Registry — the single place that maps a provider id to an implementation.
 * Adding a provider means adding a case here and to the id unions in config.ts.
 */
function buildChatProvider(id: ChatProviderId): ChatProvider {
  const { chat } = getAiConfig();
  if (!chat.apiKey) {
    throw new AiProviderError(id, `No API key configured for chat provider "${id}".`, {
      retryable: false,
    });
  }

  switch (id) {
    case 'anthropic':
      return new AnthropicChatProvider(chat);
    case 'openai':
    case 'openrouter':
      return new OpenAiCompatibleChatProvider(id, chat);
    case 'gemini':
      return new GeminiChatProvider(chat);
  }
}

function buildEmbeddingProvider(id: EmbeddingProviderId): EmbeddingProvider {
  const { embedding } = getAiConfig();
  if (!embedding.apiKey) {
    throw new AiProviderError(id, `No API key configured for embedding provider "${id}".`, {
      retryable: false,
    });
  }

  switch (id) {
    case 'openai':
    case 'openrouter':
      return new OpenAiCompatibleEmbeddingProvider(id, embedding, embedding.dimensions);
    case 'gemini':
      return new GeminiEmbeddingProvider(embedding, embedding.dimensions);
  }
}

// Providers are stateless HTTP clients, so one instance per process is enough.
// Cached by id (not just a boolean) so a config change during dev HMR rebuilds.
let chatCache: { id: string; provider: ChatProvider } | null = null;
let embeddingCache: { id: string; provider: EmbeddingProvider } | null = null;

export function getChatProvider(): ChatProvider {
  const { chat } = getAiConfig();
  const key = `${chat.provider}:${chat.model}`;
  if (chatCache?.id !== key) {
    chatCache = { id: key, provider: buildChatProvider(chat.provider) };
  }
  return chatCache.provider;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const { embedding } = getAiConfig();
  const key = `${embedding.provider}:${embedding.model}:${embedding.dimensions}`;
  if (embeddingCache?.id !== key) {
    embeddingCache = { id: key, provider: buildEmbeddingProvider(embedding.provider) };
  }
  return embeddingCache.provider;
}
