import 'server-only';
import type { ProviderCredentials } from '../config';
import {
  AiProviderError,
  providerFetch,
  readSseData,
  type ChatProvider,
  type ChatRequest,
  type ChatStreamChunk,
} from './types';

const API_VERSION = '2023-06-01';

/**
 * Anthropic Messages API.
 *
 * Notes on the request shape (current API, not the pre-2026 one):
 *  - `thinking` is omitted entirely. On Claude Opus 5 thinking is on by
 *    default, and the deprecated `budget_tokens` form is rejected with a 400.
 *  - `temperature` / `top_p` / `top_k` are removed on Opus 4.7+ and 400 if
 *    sent, so behaviour is steered through the prompt instead.
 *  - `effort: "low"` keeps latency down: this is short retrieval-grounded Q&A,
 *    not agentic work, and low effort is strong on Opus 5.
 */
export class AnthropicChatProvider implements ChatProvider {
  readonly id = 'anthropic';
  readonly model: string;
  #apiKey: string;
  #baseUrl: string;

  constructor(credentials: ProviderCredentials) {
    this.model = credentials.model;
    this.#apiKey = credentials.apiKey;
    this.#baseUrl = credentials.baseUrl.replace(/\/$/, '');
  }

  async *streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const response = await providerFetch(
      this.id,
      `${this.#baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.#apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
          output_config: { effort: 'low' },
          stream: true,
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
      let event: AnthropicStreamEvent;
      try {
        event = JSON.parse(data) as AnthropicStreamEvent;
      } catch {
        continue; // Ignore keep-alive/comment frames.
      }

      switch (event.type) {
        case 'message_start':
          inputTokens = event.message?.usage?.input_tokens ?? 0;
          break;
        case 'content_block_delta':
          // `thinking_delta` blocks are ignored — only user-visible text is
          // forwarded to the browser.
          if (event.delta?.type === 'text_delta' && event.delta.text) {
            yield { type: 'text', text: event.delta.text };
          }
          break;
        case 'message_delta':
          outputTokens = event.usage?.output_tokens ?? outputTokens;
          break;
        case 'error':
          throw new AiProviderError(
            this.id,
            event.error?.message ?? 'The AI provider reported an error mid-stream.',
          );
        default:
          break;
      }
    }

    yield { type: 'usage', usage: { inputTokens, outputTokens } };
  }
}

type AnthropicStreamEvent = {
  type: string;
  message?: { usage?: { input_tokens?: number } };
  delta?: { type?: string; text?: string };
  usage?: { output_tokens?: number };
  error?: { message?: string };
};
