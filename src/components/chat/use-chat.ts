'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Chat state machine: transport, streaming, local persistence, and retry.
 * Kept apart from the presentational components so the UI stays declarative
 * and this logic is testable on its own.
 */

export type ChatSource = {
  chunkId: string;
  title: string;
  url: string | null;
  sourceType: string;
  score: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  createdAt: number;
  /** Set when the turn failed, enabling the retry affordance. */
  error?: boolean;
};

const STORAGE_KEY = 'elenor-ai:conversation';
/** Matches the server-side history cap. */
const MAX_STORED_MESSAGES = 20;

type ServerEvent =
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'text'; text: string }
  | { type: 'done'; summary: unknown }
  | { type: 'error'; message: string; code: string };

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadStored(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate defensively — localStorage is user-writable.
    return parsed
      .filter(
        (m): m is ChatMessage =>
          typeof m === 'object' &&
          m !== null &&
          (m as ChatMessage).role !== undefined &&
          typeof (m as ChatMessage).content === 'string',
      )
      .slice(-MAX_STORED_MESSAGES);
  } catch {
    return [];
  }
}

export type UseChatResult = {
  messages: ChatMessage[];
  isStreaming: boolean;
  /** True until the first assistant token arrives. */
  isThinking: boolean;
  error: string | null;
  send: (text: string) => void;
  retry: () => void;
  clear: () => void;
  stop: () => void;
  hydrated: boolean;
};

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  // Kept in a ref so `send` never needs `messages` as a dependency, which
  // would re-create the callback on every token during a stream.
  const messagesRef = useRef<ChatMessage[]>([]);
  const lastQuestionRef = useRef<string>('');

  // Restore after mount to avoid a hydration mismatch.
  useEffect(() => {
    const stored = loadStored();
    messagesRef.current = stored;
    setMessages(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
      );
    } catch {
      // Quota exceeded or storage disabled — conversation still works in-memory.
    }
  }, [messages, hydrated]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const update = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const runTurn = useCallback(
    async (question: string, history: ChatMessage[]) => {
      const controller = new AbortController();
      abortRef.current = controller;

      setIsStreaming(true);
      setIsThinking(true);
      setError(null);

      const assistantId = newId();
      let streamed = '';

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message: question,
            conversation: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? 'The assistant is unavailable right now.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Placeholder the deltas stream into.
        update([
          ...history,
          { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf('\n\n');

            const line = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;

            let event: ServerEvent;
            try {
              event = JSON.parse(line.slice(5).trim()) as ServerEvent;
            } catch {
              continue;
            }

            if (event.type === 'text') {
              setIsThinking(false);
              streamed += event.text;
              update([
                ...history,
                {
                  id: assistantId,
                  role: 'assistant',
                  content: streamed,
                  createdAt: Date.now(),
                },
              ]);
            } else if (event.type === 'sources') {
              const sources = event.sources;
              update([
                ...history,
                {
                  id: assistantId,
                  role: 'assistant',
                  content: streamed,
                  sources,
                  createdAt: Date.now(),
                },
              ]);
            } else if (event.type === 'error') {
              setError(event.message);
            }
          }
        }

        if (!streamed.trim()) {
          throw new Error('The assistant did not return a response. Please try again.');
        }
      } catch (caught) {
        if (controller.signal.aborted) {
          // User stopped the stream: keep whatever arrived, drop the empty shell.
          update(
            streamed.trim()
              ? messagesRef.current
              : history,
          );
        } else {
          const message =
            caught instanceof Error ? caught.message : 'Something went wrong. Please try again.';
          setError(message);
          update([
            ...history,
            {
              id: assistantId,
              role: 'assistant',
              content: streamed,
              createdAt: Date.now(),
              error: true,
            },
          ]);
        }
      } finally {
        setIsStreaming(false);
        setIsThinking(false);
        abortRef.current = null;
      }
    },
    [update],
  );

  const send = useCallback(
    (text: string) => {
      const question = text.trim();
      if (!question || isStreaming) return;

      lastQuestionRef.current = question;
      const history: ChatMessage[] = [
        ...messagesRef.current,
        { id: newId(), role: 'user' as const, content: question, createdAt: Date.now() },
      ];
      update(history);
      void runTurn(question, history);
    },
    [isStreaming, runTurn, update],
  );

  /** Re-runs the last question, discarding the failed assistant turn. */
  const retry = useCallback(() => {
    if (isStreaming || !lastQuestionRef.current) return;
    const trimmed = [...messagesRef.current];
    while (trimmed.length > 0 && trimmed.at(-1)?.role === 'assistant') trimmed.pop();
    update(trimmed);
    void runTurn(lastQuestionRef.current, trimmed);
  }, [isStreaming, runTurn, update]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    update([]);
    setError(null);
    lastQuestionRef.current = '';
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore — in-memory state is already cleared.
    }
  }, [update]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { messages, isStreaming, isThinking, error, send, retry, clear, stop, hydrated };
}
