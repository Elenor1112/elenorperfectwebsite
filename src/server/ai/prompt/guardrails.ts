/**
 * Input-side guardrails.
 *
 * These are a cheap first filter, not the security boundary — the prompt rules
 * and the retrieval-only grounding are what actually constrain the model. The
 * value here is catching blatant extraction attempts before spending tokens,
 * and flagging them for the analytics dashboard.
 */

export type GuardrailVerdict =
  | { allowed: true }
  | { allowed: false; reason: GuardrailReason; response: string };

export type GuardrailReason = 'prompt-extraction' | 'injection' | 'empty';

/** Phrases whose only purpose is to extract or override the system prompt. */
const EXTRACTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|override)\b[^.?!]{0,40}\b(previous|prior|above|earlier|all)\b[^.?!]{0,20}\b(instruction|prompt|rule|direction)/i,
  /\b(reveal|show|print|repeat|output|display|tell me|what (is|are))\b[^.?!]{0,40}\b(your |the )?(system|initial|original|hidden|secret|internal)\b[^.?!]{0,20}\b(prompt|instruction|message|rule|directive)/i,
  /\brepeat\b[^.?!]{0,30}\b(everything|all|text)\b[^.?!]{0,30}\b(above|before)\b/i,
  /\byou are now\b|\bpretend (you are|to be)\b|\bact as (if|though|a)\b[^.?!]{0,30}\b(different|unrestricted|dan|jailbroken)\b/i,
  /\b(developer|debug|god|admin)\s+mode\b/i,
  /\bwhat (model|llm|ai)\b[^.?!]{0,20}\b(are you|do you use|powers you)\b/i,
];

const REFUSAL =
  "I'm the Elenor Marketing website assistant, so I can't share how I'm set up — but I'm happy to " +
  'answer anything about our services, our work, or how we could help with your project.';

/**
 * Screens a user message before it reaches the model.
 * Deliberately narrow: false positives cost a real answer, and the prompt
 * rules already handle subtler attempts.
 */
export function screenUserMessage(message: string): GuardrailVerdict {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      allowed: false,
      reason: 'empty',
      response: 'Could you tell me a little more about what you need?',
    };
  }

  for (const pattern of EXTRACTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: 'prompt-extraction', response: REFUSAL };
    }
  }

  return { allowed: true };
}

/**
 * Neutralises text that could be read as prompt structure when it is
 * interpolated into the prompt (retrieved chunks, conversation history).
 */
export function neutraliseDelimiters(text: string): string {
  return text
    .replace(/<\/?document\b[^>]*>/gi, '[document]')
    .replace(/^\s*(system|assistant|human)\s*:/gim, '$1 -');
}
