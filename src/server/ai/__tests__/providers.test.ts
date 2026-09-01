import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { AnthropicChatProvider } from '../providers/anthropic';
import { GeminiChatProvider } from '../providers/gemini';
import {
  OpenAiCompatibleChatProvider,
  OpenAiCompatibleEmbeddingProvider,
} from '../providers/openai-compatible';
import { AiProviderError, readSseData, type ChatStreamChunk } from '../providers/types';

/**
 * Provider adapters are exercised against a stubbed `fetch`, so these run
 * offline and assert the two things that actually matter: the request shape
 * sent upstream, and that each vendor's stream format normalises to the same
 * internal events.
 */

const CREDENTIALS = { apiKey: 'test-key', baseUrl: 'https://api.example.com', model: 'test-model' };
const realFetch = globalThis.fetch;

function sseResponse(frames: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const frame of frames) controller.enqueue(encoder.encode(`data: ${frame}\n\n`));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

/** Captures the outbound request so assertions can inspect it. */
function stubFetch(response: () => Response): { requests: { url: string; body: unknown }[] } {
  const requests: { url: string; body: unknown }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: String(url),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return response();
  }) as typeof fetch;
  return { requests };
}

async function collect(stream: AsyncIterable<ChatStreamChunk>) {
  let text = '';
  let usage = { inputTokens: 0, outputTokens: 0 };
  for await (const chunk of stream) {
    if (chunk.type === 'text') text += chunk.text;
    else usage = chunk.usage;
  }
  return { text, usage };
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('readSseData', () => {
  it('yields the payload of each event', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: one\n\ndata: two\n\n'));
        controller.close();
      },
    });
    const seen: string[] = [];
    for await (const data of readSseData(body)) seen.push(data);
    assert.deepEqual(seen, ['one', 'two']);
  });

  it('handles an event split across chunk boundaries', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: hel'));
        controller.enqueue(encoder.encode('lo\n\n'));
        controller.close();
      },
    });
    const seen: string[] = [];
    for await (const data of readSseData(body)) seen.push(data);
    assert.deepEqual(seen, ['hello']);
  });
});

describe('AnthropicChatProvider', () => {
  it('sends the current Messages API shape', async () => {
    const { requests } = stubFetch(() =>
      sseResponse([JSON.stringify({ type: 'message_stop' })]),
    );

    const provider = new AnthropicChatProvider(CREDENTIALS);
    await collect(
      provider.streamChat({
        system: 'You are Elenor AI.',
        messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 512,
      }),
    );

    const [request] = requests;
    assert.match(request.url, /\/v1\/messages$/);
    const body = request.body as Record<string, unknown>;
    assert.equal(body.stream, true);
    assert.equal(body.system, 'You are Elenor AI.');
    assert.equal(body.max_tokens, 512);
    // These are rejected with a 400 on current Claude models.
    assert.ok(!('temperature' in body));
    assert.ok(!('top_p' in body));
    assert.ok(!('thinking' in body));
  });

  it('streams text deltas and reports usage', async () => {
    stubFetch(() =>
      sseResponse([
        JSON.stringify({ type: 'message_start', message: { usage: { input_tokens: 42 } } }),
        JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }),
        JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: ' there' } }),
        JSON.stringify({ type: 'message_delta', usage: { output_tokens: 7 } }),
      ]),
    );

    const provider = new AnthropicChatProvider(CREDENTIALS);
    const result = await collect(
      provider.streamChat({ system: 's', messages: [{ role: 'user', content: 'hi' }], maxTokens: 10 }),
    );

    assert.equal(result.text, 'Hello there');
    assert.deepEqual(result.usage, { inputTokens: 42, outputTokens: 7 });
  });

  it('ignores thinking deltas so only user-visible text is forwarded', async () => {
    stubFetch(() =>
      sseResponse([
        JSON.stringify({ type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'hmm' } }),
        JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Answer' } }),
      ]),
    );

    const provider = new AnthropicChatProvider(CREDENTIALS);
    const result = await collect(
      provider.streamChat({ system: 's', messages: [{ role: 'user', content: 'hi' }], maxTokens: 10 }),
    );
    assert.equal(result.text, 'Answer');
  });

  it('raises a typed error on a mid-stream error event', async () => {
    stubFetch(() =>
      sseResponse([JSON.stringify({ type: 'error', error: { message: 'overloaded' } })]),
    );

    const provider = new AnthropicChatProvider(CREDENTIALS);
    await assert.rejects(
      () =>
        collect(
          provider.streamChat({ system: 's', messages: [{ role: 'user', content: 'x' }], maxTokens: 10 }),
        ),
      AiProviderError,
    );
  });

  it('marks 5xx as retryable and 4xx as not', async () => {
    globalThis.fetch = (async () => new Response('boom', { status: 503 })) as typeof fetch;
    const provider = new AnthropicChatProvider(CREDENTIALS);
    await assert.rejects(
      () => collect(provider.streamChat({ system: 's', messages: [], maxTokens: 10 })),
      (error: AiProviderError) => error.retryable === true,
    );

    globalThis.fetch = (async () => new Response('bad', { status: 400 })) as typeof fetch;
    await assert.rejects(
      () => collect(provider.streamChat({ system: 's', messages: [], maxTokens: 10 })),
      (error: AiProviderError) => error.retryable === false,
    );
  });
});

describe('OpenAiCompatibleChatProvider', () => {
  it('prepends the system prompt as a system message', async () => {
    const { requests } = stubFetch(() => sseResponse(['[DONE]']));
    const provider = new OpenAiCompatibleChatProvider('openai', CREDENTIALS);
    await collect(
      provider.streamChat({
        system: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 64,
      }),
    );

    const body = requests[0].body as { messages: { role: string; content: string }[] };
    assert.equal(body.messages[0].role, 'system');
    assert.equal(body.messages[0].content, 'sys');
    assert.equal(body.messages[1].role, 'user');
  });

  it('streams choice deltas and stops at [DONE]', async () => {
    stubFetch(() =>
      sseResponse([
        JSON.stringify({ choices: [{ delta: { content: 'Hi' } }] }),
        JSON.stringify({ choices: [{ delta: { content: ' there' } }] }),
        JSON.stringify({ usage: { prompt_tokens: 5, completion_tokens: 2 } }),
        '[DONE]',
      ]),
    );

    const provider = new OpenAiCompatibleChatProvider('openai', CREDENTIALS);
    const result = await collect(
      provider.streamChat({ system: 's', messages: [{ role: 'user', content: 'x' }], maxTokens: 10 }),
    );
    assert.equal(result.text, 'Hi there');
    assert.deepEqual(result.usage, { inputTokens: 5, outputTokens: 2 });
  });
});

describe('GeminiChatProvider', () => {
  it('maps assistant turns to the "model" role and lifts the system prompt', async () => {
    const { requests } = stubFetch(() => sseResponse([JSON.stringify({ candidates: [] })]));
    const provider = new GeminiChatProvider(CREDENTIALS);
    await collect(
      provider.streamChat({
        system: 'sys',
        messages: [
          { role: 'user', content: 'a' },
          { role: 'assistant', content: 'b' },
        ],
        maxTokens: 32,
      }),
    );

    const body = requests[0].body as {
      systemInstruction: { parts: { text: string }[] };
      contents: { role: string }[];
    };
    assert.equal(body.systemInstruction.parts[0].text, 'sys');
    assert.deepEqual(
      body.contents.map((c) => c.role),
      ['user', 'model'],
    );
  });

  it('streams candidate parts', async () => {
    stubFetch(() =>
      sseResponse([
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Hello' }] } }] }),
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '!' }] } }],
          usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 1 },
        }),
      ]),
    );

    const provider = new GeminiChatProvider(CREDENTIALS);
    const result = await collect(
      provider.streamChat({ system: 's', messages: [{ role: 'user', content: 'x' }], maxTokens: 10 }),
    );
    assert.equal(result.text, 'Hello!');
    assert.deepEqual(result.usage, { inputTokens: 3, outputTokens: 1 });
  });
});

describe('OpenAiCompatibleEmbeddingProvider', () => {
  it('returns embeddings in input order regardless of response order', async () => {
    globalThis.fetch = (async () =>
      Response.json({
        data: [
          { index: 1, embedding: [0.2] },
          { index: 0, embedding: [0.1] },
        ],
      })) as typeof fetch;

    const provider = new OpenAiCompatibleEmbeddingProvider('openai', CREDENTIALS, 1536);
    assert.deepEqual(await provider.embed(['a', 'b']), [[0.1], [0.2]]);
  });

  it('short-circuits on an empty batch without calling the API', async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return Response.json({ data: [] });
    }) as typeof fetch;

    const provider = new OpenAiCompatibleEmbeddingProvider('openai', CREDENTIALS, 1536);
    assert.deepEqual(await provider.embed([]), []);
    assert.equal(called, false);
  });

  it('throws when the provider returns the wrong number of embeddings', async () => {
    globalThis.fetch = (async () =>
      Response.json({ data: [{ index: 0, embedding: [0.1] }] })) as typeof fetch;

    const provider = new OpenAiCompatibleEmbeddingProvider('openai', CREDENTIALS, 1536);
    await assert.rejects(() => provider.embed(['a', 'b']), AiProviderError);
  });
});
