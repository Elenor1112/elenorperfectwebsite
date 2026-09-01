import 'server-only';
import type { ChunkMetadata, KnowledgeSourceType } from '@/db/schema';
import { getAiConfig, isEmbeddingConfigured } from '../config';
import {
  assertDimensionsMatch,
  deleteChunksForSource,
  getIndexedHashes,
  replaceChunksForSource,
  type StoredChunk,
} from '../retrieval/vector-store';
import { chunkText } from './chunker';
import { embedTexts, hashContent } from './embedding-service';
import { collectKnowledgeDocuments, type KnowledgeDocument } from './sources';

/**
 * Turns CMS content into embedded chunks.
 *
 * Indexing is idempotent and content-addressed: a document whose hash matches
 * what is already stored is skipped entirely, so a routine "save" on an
 * unrelated page costs no embedding tokens.
 */

export type IndexResult = {
  indexed: number;
  skipped: number;
  removed: number;
  chunks: number;
  errors: string[];
  /** True when the run was a no-op because no embedding key is configured. */
  skippedNoProvider: boolean;
};

const EMPTY_RESULT: IndexResult = {
  indexed: 0,
  skipped: 0,
  removed: 0,
  chunks: 0,
  errors: [],
  skippedNoProvider: true,
};

function buildChunks(doc: KnowledgeDocument, embeddings: number[][], texts: string[], hash: string): StoredChunk[] {
  return texts.map((content, i) => {
    const metadata: ChunkMetadata = {
      url: doc.url,
      chunkIndex: i,
      totalChunks: texts.length,
      keywords: doc.keywords.length > 0 ? doc.keywords.slice(0, 20) : undefined,
    };
    return {
      sourceType: doc.sourceType,
      sourceId: doc.sourceId,
      title: doc.title,
      slug: doc.slug,
      // Prefixing the title gives each chunk standalone context, which
      // measurably improves retrieval for chunks from the middle of a doc.
      content: i === 0 ? content : `${doc.title}\n\n${content}`,
      embedding: embeddings[i],
      metadata,
      contentHash: hash,
    };
  });
}

/**
 * Rebuilds the index.
 *
 * @param options.force  Re-embed even when the content hash is unchanged.
 * @param options.only   Restrict to one source type (used by targeted syncs).
 */
export async function reindexKnowledgeBase(
  options: { force?: boolean; only?: KnowledgeSourceType } = {},
): Promise<IndexResult> {
  if (!isEmbeddingConfigured()) {
    console.warn('[elenor-ai] Skipping index: no embedding provider API key configured.');
    return { ...EMPTY_RESULT };
  }

  const { retrieval, embedding } = getAiConfig();
  // Fail before spending tokens on embeddings the column cannot store.
  if (retrieval.mode === 'vector') await assertDimensionsMatch(embedding.dimensions);

  const result: IndexResult = {
    indexed: 0,
    skipped: 0,
    removed: 0,
    chunks: 0,
    errors: [],
    skippedNoProvider: false,
  };

  const allDocuments = await collectKnowledgeDocuments();
  const documents = options.only
    ? allDocuments.filter((doc) => doc.sourceType === options.only)
    : allDocuments;

  const existing = await getIndexedHashes();
  const seen = new Set<string>();

  for (const doc of documents) {
    const key = `${doc.sourceType}:${doc.sourceId}`;
    seen.add(key);

    const hash = hashContent(doc.title, doc.content);
    if (!options.force && existing.get(key) === hash) {
      result.skipped += 1;
      continue;
    }

    try {
      const texts = chunkText(doc.content, {
        chunkWords: retrieval.chunkWords,
        overlapWords: retrieval.chunkOverlapWords,
      });
      if (texts.length === 0) {
        result.skipped += 1;
        continue;
      }

      // Keyword mode stores chunks with a zero vector — retrieval never reads
      // the column, and skipping the API call is the whole point of the mode.
      const embeddings =
        retrieval.mode === 'keyword'
          ? texts.map(() => new Array(embedding.dimensions).fill(0) as number[])
          : await embedTexts(texts);

      await replaceChunksForSource(
        doc.sourceType,
        doc.sourceId,
        buildChunks(doc, embeddings, texts, hash),
      );

      result.indexed += 1;
      result.chunks += texts.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`${key}: ${message}`);
      console.error(`[elenor-ai] Failed to index ${key}:`, error);
    }
  }

  // Drop documents that disappeared (deleted or unpublished). Scoped to the
  // filtered type so a targeted sync never prunes unrelated sources.
  for (const key of existing.keys()) {
    if (seen.has(key)) continue;
    const [sourceType, ...rest] = key.split(':');
    if (options.only && sourceType !== options.only) continue;
    try {
      await deleteChunksForSource(sourceType as KnowledgeSourceType, rest.join(':'));
      result.removed += 1;
    } catch (error) {
      result.errors.push(`remove ${key}: ${String(error)}`);
    }
  }

  return result;
}

/**
 * Fire-and-forget reindex for use inside CMS server actions.
 *
 * Editors should never wait on (or be blocked by) embedding latency, so this
 * intentionally does not await the work and swallows failures after logging
 * them — the next successful save or a manual rebuild will reconcile.
 */
export function scheduleReindex(only?: KnowledgeSourceType): void {
  if (!isEmbeddingConfigured()) return;
  void reindexKnowledgeBase({ only }).catch((error) => {
    console.error('[elenor-ai] Background reindex failed:', error);
  });
}
