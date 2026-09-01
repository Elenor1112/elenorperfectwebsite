/**
 * Rebuilds the Elenor AI knowledge index from the CMS.
 *
 * Indexing normally happens automatically whenever an editor publishes a
 * change (see src/lib/revalidate.ts). Use this for the first build after a
 * deploy, after changing the embedding model, or to repair a partial index.
 *
 * Usage: npm run ai:index [-- --force]
 *   --force  re-embed every document even if its content hash is unchanged.
 */
import { Module } from 'node:module';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

// The AI modules are marked `server-only`, which throws outside a React Server
// Component. Stub the specifier so they can be imported by this CLI; the guard
// still applies to the application build.
type Loader = (
  request: string,
  parent: NodeJS.Module | undefined,
  isMain: boolean,
  options?: unknown,
) => unknown;

const moduleInternals = Module as unknown as { _load: Loader };
const originalLoad = moduleInternals._load;
moduleInternals._load = function patchedLoad(request, parent, isMain, options) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, parent, isMain, options);
};

async function main(): Promise<void> {
  const force = process.argv.includes('--force');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set — add it to .env.local (see .env.example).');
    process.exit(1);
  }

  // Imported after the stub is installed.
  const { isEmbeddingConfigured, getAiConfig } = await import('../src/server/ai/config');
  if (!isEmbeddingConfigured()) {
    console.error(
      'No embedding provider configured. Either set AI_EMBEDDING_PROVIDER and the matching\n' +
        'API key, or set AI_RETRIEVAL_MODE="keyword" to index without embeddings.\n' +
        'See docs/ai/README.md.',
    );
    process.exit(1);
  }

  const { embedding, retrieval } = getAiConfig();
  console.log(
    retrieval.mode === 'keyword'
      ? `Indexing in keyword mode (Postgres full-text — no embeddings)${force ? ' · forced rebuild' : ''}`
      : `Indexing with ${embedding.provider} · ${embedding.model} (${embedding.dimensions}d)` +
          `${force ? ' · forced rebuild' : ''}`,
  );

  const { reindexKnowledgeBase } = await import('../src/server/ai/indexing/indexer');
  const started = Date.now();
  const result = await reindexKnowledgeBase({ force });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log(
    `\nDone in ${seconds}s\n` +
      `  indexed : ${result.indexed} document(s), ${result.chunks} chunk(s)\n` +
      `  skipped : ${result.skipped} unchanged\n` +
      `  removed : ${result.removed} stale`,
  );

  if (result.errors.length > 0) {
    console.error(`\n${result.errors.length} document(s) failed:`);
    for (const error of result.errors) console.error(`  - ${error}`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Reindex failed:', error);
    process.exit(1);
  });
