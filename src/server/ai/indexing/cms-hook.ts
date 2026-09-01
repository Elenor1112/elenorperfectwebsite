import 'server-only';
import type { KnowledgeSourceType } from '@/db/schema';

/**
 * Bridge between CMS mutations and the knowledge index.
 *
 * Lives behind a dynamic import so the AI stack (and its transitive database
 * imports) is only pulled in when an editor actually saves something —
 * `revalidate.ts` is on the hot path of every server action and must stay
 * cheap to load.
 *
 * Reindexing is intentionally fire-and-forget: an editor's save must never
 * block on embedding latency, and a failed index self-heals on the next save
 * or via the admin "Rebuild knowledge" action.
 */
export function reindexAfterContentChange(sourceType?: KnowledgeSourceType): void {
  // `revalidateX` helpers are also called from scripts and tests where the AI
  // stack may be unconfigured; the indexer no-ops in that case.
  void import('./indexer')
    .then(({ scheduleReindex }) => scheduleReindex(sourceType))
    .catch((error) => {
      console.error('[elenor-ai] Could not schedule reindex:', error);
    });
}
