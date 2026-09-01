import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { cookies } from 'next/headers';

/**
 * Anonymous visitor identity for chat.
 *
 * Mirrors the admin session design in src/server/auth/session.ts: the browser
 * holds a random token, the database only ever stores its SHA-256. A database
 * leak therefore cannot be replayed as somebody's chat session.
 *
 * This is deliberately separate from the admin session — a chat visitor is not
 * authenticated and must never gain admin capabilities.
 */

export const CHAT_SESSION_COOKIE = 'elenor_chat_session';
const SESSION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Reads the visitor's token without creating one. */
export function readChatSessionToken(): string | null {
  return cookies().get(CHAT_SESSION_COOKIE)?.value ?? null;
}

export type ChatSession = {
  token: string;
  key: string;
  /** True when the caller must set the cookie on the response. */
  isNew: boolean;
};

/**
 * Returns the current session, minting one if absent.
 *
 * Cookie writes are not allowed during an RSC render, so this returns the
 * token and lets the route handler attach it via `Set-Cookie` (see
 * `chatSessionCookie` below).
 */
export function resolveChatSession(): ChatSession {
  const existing = readChatSessionToken();
  if (existing) {
    return { token: existing, key: hashSessionToken(existing), isNew: false };
  }
  const token = randomBytes(32).toString('base64url');
  return { token, key: hashSessionToken(token), isNew: true };
}

/** `Set-Cookie` value for a newly minted session. */
export function chatSessionCookie(token: string): string {
  const attributes = [
    `${CHAT_SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${(SESSION_DAYS * DAY_MS) / 1000}`,
  ];
  if (process.env.NODE_ENV === 'production') attributes.push('Secure');
  return attributes.join('; ');
}
