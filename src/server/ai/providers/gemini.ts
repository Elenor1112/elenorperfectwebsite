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
 * Google Generative Language API. Differs from the OpenAI shape in three ways
 * that this adapter normalises away: the system prompt is a separate
 * `systemInstruction` field, assistant turns are named `model`, and content is
 * a `parts` array rather than a string.
 */
export class GeminiChatProvider implements ChatProvider {
  readonly id = 'gemini';
  readonly model: string;
  #apiKey: string;
  #baseUrl: string;

  constructor(credentials: ProviderCredentials) {
    this.model = credentials.model;
    this.#apiKey = credentials.apiKey;
    this.#baseUrl = credentials.baseUrl.replace(/\/$/, '');
  }

  async *streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const url =
      `${this.#baseUrl}/models/${encodeURIComponent(this.model)}:streamGenerateContent` +
      `?alt=sse&key=${encodeURIComponent(this.#apiKey)}`;

    const response = await providerFetch(
      this.id,
      url,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: request.messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: request.maxTokens },
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
      let event: GeminiStreamEvent;
      try {
        event = JSON.parse(data) as GeminiStreamEvent;
      } catch {
        continue;
      }

      if (event.error) {
        throw new AiProviderError(
          this.id,
          event.error.message ?? 'The AI provider reported an error mid-stream.',
        );
      }

      for (const part of event.candidates?.[0]?.content?.parts ?? []) {
        if (part.text) yield { type: 'text', text: part.text };
      }

      if (event.usageMetadata) {
        inputTokens = event.usageMetadata.promptTokenCount ?? inputTokens;
        outputTokens = event.usageMetadata.candidatesTokenCount ?? outputTokens;
      }
    }

    yield { type: 'usage', usage: { inputTokens, outputTokens } };
  }
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly id = 'gemini';
  readonly model: string;
  readonly dimensions: number;
  #apiKey: string;
  #baseUrl: string;

  constructor(credentials: ProviderCredentials, dimensions: number) {
    this.model = credentials.model;
    this.dimensions = dimensions;
    this.#apiKey = credentials.apiKey;
    this.#baseUrl = credentials.baseUrl.replace(/\/$/, '');
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const model = this.model.startsWith('models/') ? this.model : `models/${this.model}`;
    const url =
      `${this.#baseUrl}/${model}:batchEmbedContents?key=${encodeURIComponent(this.#apiKey)}`;

    const response = await providerFetch(this.id, url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model,
          content: { parts: [{ text }] },
          outputDimensionality: this.dimensions,
        })),
      }),
    });

    const payload = (await response.json()) as {
      embeddings?: { values: number[] }[];
    };
    const rows = payload.embeddings ?? [];
    if (rows.length !== texts.length) {
      throw new AiProviderError(
        this.id,
        `Expected ${texts.length} embeddings, received ${rows.length}.`,
        { retryable: true },
      );
    }
    return rows.map((row) => row.values);
  }
}

type GeminiStreamEvent = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
};
