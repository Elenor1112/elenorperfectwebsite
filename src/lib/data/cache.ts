import 'server-only';
import { unstable_cache } from 'next/cache';

/**
 * `unstable_cache` needs Next's incremental cache, which only exists inside a
 * request or a build. Called from a plain Node process — the reindex CLI, a
 * test harness — it throws:
 *
 *   Invariant: incrementalCache missing in unstable_cache <fn>
 *
 * `cachedQuery` catches exactly that invariant and falls back to calling the
 * fetcher directly, so one data-layer function serves both worlds: cached
 * during a request, uncached outside one.
 *
 * Only the missing-cache invariant is swallowed. A genuine failure inside the
 * fetcher (a bad query, an unreachable database) propagates untouched.
 */
function isMissingCacheInvariant(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('incrementalCache missing')
  );
}

export async function cachedQuery<T>(
  fetcher: () => Promise<T>,
  keyParts: string[],
  options: { tags: string[]; revalidate?: number | false },
): Promise<T> {
  try {
    return await unstable_cache(fetcher, keyParts, options)();
  } catch (error) {
    if (isMissingCacheInvariant(error)) return fetcher();
    throw error;
  }
}
