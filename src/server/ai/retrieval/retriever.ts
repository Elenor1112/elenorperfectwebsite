import 'server-only';
import { getAiConfig } from '../config';
import { embedQuery } from '../indexing/embedding-service';
import { searchKeyword, searchSimilar, type SearchHit } from './vector-store';

/**
 * Query → embedding → vector search → ranked chunks.
 *
 * Kept separate from the chat service so retrieval quality can be evaluated on
 * its own, and so a different retrieval strategy (hybrid search, reranking)
 * can be introduced without touching generation.
 */

export type RetrievalResult = {
  hits: SearchHit[];
  /** Wall-clock time for embed + search, recorded in analytics. */
  durationMs: number;
};

/**
 * A follow-up like "how much does that cost?" carries no searchable terms on
 * its own, so recent context is folded into the embedded text. Only the query
 * used for retrieval is affected — the prompt still sees the real question.
 */
function buildSearchText(question: string, recentContext: string[]): string {
  const trimmed = question.trim();
  const isShortFollowUp = trimmed.split(/\s+/).length <= 6 && recentContext.length > 0;
  if (!isShortFollowUp) return trimmed;
  return `${recentContext.slice(-2).join(' ')} ${trimmed}`.slice(0, 2000);
}

export async function retrieveContext(
  question: string,
  options: { recentContext?: string[] } = {},
): Promise<RetrievalResult> {
  const started = Date.now();
  const { retrieval } = getAiConfig();

  const searchText = buildSearchText(question, options.recentContext ?? []);

  // Keyword mode applies no score floor: ts_rank_cd values are normalised
  // against the top hit, so a cosine-tuned threshold would reject everything.
  // The tsquery match itself is the relevance gate.
  const hits =
    retrieval.mode === 'keyword'
      ? await searchKeyword(searchText, { limit: retrieval.maxChunks })
      : await searchSimilar(await embedQuery(searchText), {
          limit: retrieval.maxChunks,
          minScore: retrieval.minScore,
        });

  return { hits, durationMs: Date.now() - started };
}
