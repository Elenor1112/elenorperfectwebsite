import 'server-only';

/**
 * Provider-agnostic contracts. Everything downstream of these types is written
 * against the interfaces, never against a vendor SDK, so adding a provider is
 * a new file in this folder plus one line in the registry.
 */

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatRequest = {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  /** Abort signal propagated from the HTTP request so a disconnected client
   *  stops the upstream call instead of burning tokens. */
  signal?: AbortSignal;
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

/** Streaming yields text deltas, then resolves usage once the stream ends. */
export type ChatStreamChunk =
  | { type: 'text'; text: string }
  | { type: 'usage'; usage: TokenUsage };

export interface ChatProvider {
  readonly id: string;
  readonly model: string;
  /** Async iterator of deltas. Implementations must translate transport errors
   *  into AiProviderError so the orchestrator can decide about retries. */
  streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk>;
}

export interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dimensions: number;
  /** Batch API — implementations must preserve input order in the output. */
  embed(texts: string[]): Promise<number[][]>;
}

/** Normalised provider failure. `retryable` drives the single-retry policy. */
export class AiProviderError extends Error {
  readonly provider: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(
    provider: string,
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AiProviderError';
    this.provider = provider;
    this.status = options.status ?? 0;
    this.retryable =
      options.retryable ??
      // 408/409/429 and 5xx are transient; 4xx client errors are not.
      (options.status === undefined
        ? true
        : [408, 409, 429].includes(options.status) || options.status >= 500);
  }
}

/** Shared fetch wrapper: adds a timeout, normalises errors, keeps the signal. */
export async function providerFetch(
  provider: string,
  url: string,
  init: RequestInit & { signal?: AbortSignal },
  timeoutMs = 60_000,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal });
  } catch (cause) {
    // A caller-initiated abort is not a provider failure — rethrow as-is so
    // the route can distinguish "client went away" from "upstream broke".
    if (init.signal?.aborted) throw cause;
    throw new AiProviderError(provider, 'Could not reach the AI provider.', {
      retryable: true,
      cause,
    });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AiProviderError(
      provider,
      `Provider responded ${response.status}: ${detail.slice(0, 300)}`,
      { status: response.status },
    );
  }
  return response;
}

/**
 * Parses a Server-Sent Events body into `data:` payload strings.
 * Shared by the OpenAI-compatible and Anthropic streaming implementations.
 */
export async function* readSseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Events are separated by a blank line; a single event may carry
      // several `data:` lines that concatenate.
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const data = rawEvent
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('');

        if (data) yield data;
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.releaseLock();
  }
}
