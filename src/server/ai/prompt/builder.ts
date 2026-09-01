import type { ChatMessage } from '../providers/types';
import type { SearchHit } from '../retrieval/vector-store';
import { buildContextSegment } from './context';
import { neutraliseDelimiters } from './guardrails';
import { buildIdentitySegment, type IdentityContext } from './identity';
import { buildRulesSegment } from './rules';

/**
 * Assembles the prompt from its segments:
 *
 *   System Identity → Company Rules → Retrieved Documents
 *   → Conversation History → Current User Question
 *
 * The first three become the system prompt; the last two become the message
 * array, which is the shape every provider expects. Kept free of `server-only`
 * and of any I/O so the whole pipeline is unit-testable.
 */

export type PromptInput = {
  identity: IdentityContext;
  hits: SearchHit[];
  /** Prior turns, oldest first, excluding the current question. */
  history: ChatMessage[];
  question: string;
  /** Cap on retained turns; older ones are dropped. */
  maxHistoryMessages: number;
};

export type BuiltPrompt = {
  system: string;
  messages: ChatMessage[];
};

export function buildPrompt(input: PromptInput): BuiltPrompt {
  const system = [
    buildIdentitySegment(input.identity),
    '',
    buildRulesSegment({
      contactEmail: input.identity.contactEmail,
      contactPhone: input.identity.contactPhone,
    }),
    '',
    buildContextSegment(
      input.hits.map((hit) => ({ ...hit, content: neutraliseDelimiters(hit.content) })),
    ),
  ].join('\n');

  // Keep the most recent turns. `maxHistoryMessages` counts the whole
  // conversation, so the current question claims one slot.
  const historyBudget = Math.max(0, input.maxHistoryMessages - 1);
  const trimmed = input.history.slice(-historyBudget);

  // Providers reject a leading assistant turn, so drop one if trimming exposed it.
  while (trimmed.length > 0 && trimmed[0].role === 'assistant') trimmed.shift();

  const messages: ChatMessage[] = [
    ...trimmed.map((message) => ({
      role: message.role,
      content: neutraliseDelimiters(message.content),
    })),
    { role: 'user' as const, content: input.question.trim() },
  ];

  return { system, messages };
}
