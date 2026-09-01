import 'server-only';
import type { ProviderCredentials } from '../config';
import {
  AiProviderError,
  providerFetch,
  readSseData,
  type ChatProvider,
  type ChatRequest,
  type ChatStreamChunk,
  type EmbeddingProvider,
} from './types';

/**
 * OpenAI and OpenRouter expose the same `/chat/completions` and `/embeddings`
 * contract, so one implementation serves both — only the id, base URL and
 * auth headers differ.
 */
export class OpenAiCompatibleChatProvider implements ChatProvider {
  readonly id: string;
  readonly model: string;
  #apiKey: string;
  #baseUrl: string;

  constructor(id: string, credentials: ProviderCredentials) {
    this.id = id;
    this.model = credentials.model;
    this.#apiKey = credentials.apiKey;
    this.#baseUrl = credentials.baseUrl.replace(/\/$/, '');
  }

  async *streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const response = await providerFetch(
      this.id,
      `${this.#baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.#apiKey}`,
          // OpenRouter attributes traffic with these; harmless on OpenAI.
          'http-referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://elenor-marketing.com',
          'x-title': 'Elenor AI',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens,
          messages: [
            { role: 'system', content: request.system },
            ...request.messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
          // Ask for usage on the final SSE frame (OpenAI + OpenRouter).
          stream_options: { include_usage: true },
        }),
        signal: request.signal,
      },
    );

    if (!response.body) {
      throw new AiProviderError(this.id, 'Provider returned an empty stream.');
    }

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const data of readSseData(response.body)) {
      if (data === '[DONE]') break;

      let event: OpenAiStreamEvent;
      try {
        event = JSON.parse(data) as OpenAiStreamEvent;
      } catch {
        continue;
      }

      if (event.error) {
        throw new AiProviderError(
          this.id,
          event.error.message ?? 'The AI provider reported an error mid-stream.',
        );
      }

      const text = event.choices?.[0]?.delta?.content;
      if (text) yield { type: 'text', text };

      if (event.usage) {
        inputTokens = event.usage.prompt_tokens ?? inputTokens;
        outputTokens = event.usage.completion_tokens ?? outputTokens;
      }
    }

    yield { type: 'usage', usage: { inputTokens, outputTokens } };
  }
}

export class OpenAiCompatibleEmbeddingProvider implements EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dimensions: number;
  #apiKey: string;
  #baseUrl: string;

  constructor(id: string, credentials: ProviderCredentials, dimensions: number) {
    this.id = id;
    this.model = credentials.model;
    this.dimensions = dimensions;
    this.#apiKey = credentials.apiKey;
    this.#baseUrl = credentials.baseUrl.replace(/\/$/, '');
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await providerFetch(this.id, `${this.#baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.#apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        // `text-embedding-3-*` supports shortening; older models ignore this.
        ...(this.model.includes('text-embedding-3') ? { dimensions: this.dimensions } : {}),
      }),
    });

    const payload = (await response.json()) as {
      data?: { embedding: number[]; index: number }[];
    };
    const rows = payload.data ?? [];
    if (rows.length !== texts.length) {
      throw new AiProviderError(
        this.id,
        `Expected ${texts.length} embeddings, received ${rows.length}.`,
        { retryable: true },
      );
    }

    // The API documents index-ordered output but sorting makes that explicit.
    return rows.slice().sort((a, b) => a.index - b.index).map((row) => row.embedding);
  }
}

type OpenAiStreamEvent = {
  choices?: { delta?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};
