import 'server-only';
import { getAiConfig } from '../config';
import { buildPrompt } from '../prompt/builder';
import { screenUserMessage } from '../prompt/guardrails';
import { NO_INFORMATION_RESPONSE } from '../prompt/identity';
import { getChatProvider } from '../providers';
import { AiProviderError, type ChatMessage } from '../providers/types';
import { retrieveContext } from '../retrieval/retriever';
import type { SearchHit } from '../retrieval/vector-store';
import { getSiteSettings } from '@/lib/data/settings';

/**
 * Orchestrates one assistant turn: guardrails → retrieval → prompt → stream.
 *
 * Emits a typed event stream rather than raw text so the transport layer
 * (route handler) stays free of business logic and the same service can back a
 * server action or a test harness.
 */

export type ChatTurnEvent =
  | { type: 'sources'; sources: TurnSource[] }
  | { type: 'text'; text: string }
  | { type: 'done'; summary: TurnSummary }
  | { type: 'error'; message: string; code: string };

export type TurnSource = {
  chunkId: string;
  title: string;
  url: string | null;
  sourceType: string;
  score: number;
};

export type TurnSummary = {
  answer: string;
  sources: TurnSource[];
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  retrievalMs: number;
  llmMs: number;
  totalMs: number;
  /** True when the assistant could not answer from the knowledge base. */
  unanswered: boolean;
  retrievedChunkIds: string[];
  topScore: number;
  errorCode: string;
};

export type ChatTurnInput = {
  question: string;
  history: ChatMessage[];
  signal?: AbortSignal;
};

const FRIENDLY_ERROR =
  "I'm having trouble reaching my knowledge base right now. Please try again in a moment, " +
  'or contact our team directly and someone will help you straight away.';

function toSources(hits: SearchHit[]): TurnSource[] {
  return hits.map((hit) => ({
    chunkId: hit.id,
    title: hit.title,
    url: hit.metadata.url,
    sourceType: hit.sourceType,
    score: Number(hit.score.toFixed(4)),
  }));
}

/** Detects the "no information" answer so it can be reported as unanswered. */
function isUnanswered(answer: string, hitCount: number): boolean {
  if (hitCount === 0) return true;
  const normalised = answer.toLowerCase();
  return normalised.includes("i don't currently have that information");
}

/**
 * Runs a turn, yielding events as they happen.
 *
 * Failure policy (per spec): retry a transient provider failure once, then
 * degrade to a friendly message. The generator never throws for provider
 * problems — it emits an `error` event so the caller can always finish the
 * stream cleanly.
 */
export async function* runChatTurn(input: ChatTurnInput): AsyncGenerator<ChatTurnEvent> {
  const startedAt = Date.now();
  const config = getAiConfig();

  const base: TurnSummary = {
    answer: '',
    sources: [],
    provider: config.chat.provider,
    model: config.chat.model,
    inputTokens: 0,
    outputTokens: 0,
    retrievalMs: 0,
    llmMs: 0,
    totalMs: 0,
    unanswered: false,
    retrievedChunkIds: [],
    topScore: 0,
    errorCode: '',
  };

  // 1. Guardrails — refuse extraction attempts without spending a token.
  const verdict = screenUserMessage(input.question);
  if (!verdict.allowed) {
    yield { type: 'text', text: verdict.response };
    yield {
      type: 'done',
      summary: {
        ...base,
        answer: verdict.response,
        unanswered: true,
        totalMs: Date.now() - startedAt,
        errorCode: `blocked:${verdict.reason}`,
      },
    };
    return;
  }

  // 2. Retrieval. A failure here is fatal for the turn: answering without
  //    grounding is exactly what the assistant must never do.
  let hits: SearchHit[] = [];
  let retrievalMs = 0;
  try {
    const retrieved = await retrieveContext(input.question, {
      recentContext: input.history.filter((m) => m.role === 'user').map((m) => m.content),
    });
    hits = retrieved.hits;
    retrievalMs = retrieved.durationMs;
  } catch (error) {
    console.error('[elenor-ai] Retrieval failed:', error);
    yield { type: 'text', text: FRIENDLY_ERROR };
    yield {
      type: 'done',
      summary: {
        ...base,
        answer: FRIENDLY_ERROR,
        unanswered: true,
        retrievalMs,
        totalMs: Date.now() - startedAt,
        errorCode: 'retrieval_failed',
      },
    };
    return;
  }

  const sources = toSources(hits);
  yield { type: 'sources', sources };

  // 3. Nothing relevant — answer honestly without calling the model.
  if (hits.length === 0) {
    yield { type: 'text', text: NO_INFORMATION_RESPONSE };
    yield {
      type: 'done',
      summary: {
        ...base,
        answer: NO_INFORMATION_RESPONSE,
        retrievalMs,
        unanswered: true,
        totalMs: Date.now() - startedAt,
      },
    };
    return;
  }

  // 4. Prompt assembly.
  const site = await getSiteSettings();
  const prompt = buildPrompt({
    identity: {
      companyName: site.name,
      tagline: site.tagline,
      contactEmail: site.email,
      contactPhone: site.phoneDisplay,
    },
    hits,
    history: input.history,
    question: input.question,
    maxHistoryMessages: config.limits.maxHistoryMessages,
  });

  // 5. Generation, with one retry on a transient failure.
  const llmStarted = Date.now();
  let answer = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const provider = getChatProvider();
      for await (const chunk of provider.streamChat({
        system: prompt.system,
        messages: prompt.messages,
        maxTokens: config.limits.maxOutputTokens,
        signal: input.signal,
      })) {
        if (chunk.type === 'text') {
          answer += chunk.text;
          yield { type: 'text', text: chunk.text };
        } else {
          inputTokens = chunk.usage.inputTokens;
          outputTokens = chunk.usage.outputTokens;
        }
      }
      break;
    } catch (error) {
      if (input.signal?.aborted) return; // Client disconnected — stay quiet.

      const retryable = error instanceof AiProviderError ? error.retryable : true;
      // Only retry when nothing was emitted; re-running after partial output
      // would duplicate text in the user's view.
      const canRetry = attempt === 1 && retryable && answer.length === 0;
      console.error(
        `[elenor-ai] Generation attempt ${attempt} failed${canRetry ? ', retrying' : ''}:`,
        error,
      );

      if (canRetry) continue;

      const message = answer.length > 0 ? '' : FRIENDLY_ERROR;
      if (message) yield { type: 'text', text: message };
      yield {
        type: 'done',
        summary: {
          ...base,
          answer: answer || FRIENDLY_ERROR,
          sources,
          retrievalMs,
          llmMs: Date.now() - llmStarted,
          totalMs: Date.now() - startedAt,
          unanswered: true,
          retrievedChunkIds: hits.map((h) => h.id),
          topScore: hits[0]?.score ?? 0,
          errorCode: error instanceof AiProviderError ? 'provider_error' : 'unknown_error',
        },
      };
      return;
    }
  }

  yield {
    type: 'done',
    summary: {
      ...base,
      answer,
      sources,
      inputTokens,
      outputTokens,
      retrievalMs,
      llmMs: Date.now() - llmStarted,
      totalMs: Date.now() - startedAt,
      unanswered: isUnanswered(answer, hits.length),
      retrievedChunkIds: hits.map((h) => h.id),
      topScore: hits[0]?.score ?? 0,
    },
  };
}
