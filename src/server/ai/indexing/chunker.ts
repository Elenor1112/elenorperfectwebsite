/**
 * Word-window chunker with overlap.
 *
 * Pure and dependency-free so it can be unit-tested without a database or an
 * API key. Splitting happens on paragraph boundaries where possible, which
 * keeps a chunk from starting mid-sentence and improves retrieval quality
 * compared to a naive fixed-width slice.
 */

export type ChunkOptions = {
  /** Target words per chunk (~500 per the spec). */
  chunkWords: number;
  /** Words repeated from the previous chunk (~100 per the spec). */
  overlapWords: number;
};

/** Collapses whitespace and strips control characters. */
export function normaliseText(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex -- strip C0 controls except \n and \t
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Splits text into overlapping windows.
 *
 * Paragraphs are packed into a chunk until the word budget is reached. A
 * paragraph longer than the budget on its own is hard-split rather than
 * emitted oversized, so no single chunk can blow the embedding input limit.
 */
export function chunkText(input: string, options: ChunkOptions): string[] {
  const text = normaliseText(input);
  if (!text) return [];

  const chunkWords = Math.max(50, Math.floor(options.chunkWords));
  // Cap overlap at half the window. Allowing it to approach `chunkWords` makes
  // the stride collapse toward 1, which produces near-duplicate chunks and a
  // combinatorial embedding bill.
  const overlapWords = Math.max(
    0,
    Math.min(Math.floor(options.overlapWords), Math.floor(chunkWords / 2)),
  );

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= chunkWords) return [text];

  // Word index at which each paragraph starts — used to prefer breaking on a
  // paragraph boundary near the end of the window.
  const paragraphStarts = new Set<number>();
  let cursor = 0;
  for (const paragraph of text.split(/\n{2,}/)) {
    const count = paragraph.split(/\s+/).filter(Boolean).length;
    if (count > 0) {
      paragraphStarts.add(cursor);
      cursor += count;
    }
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    let end = Math.min(start + chunkWords, words.length);

    // Snap the end to a paragraph boundary if one sits in the last quarter of
    // the window — avoids cutting a paragraph in half when it's cheap not to.
    if (end < words.length) {
      const earliest = start + Math.floor(chunkWords * 0.75);
      for (let i = end; i > earliest; i -= 1) {
        if (paragraphStarts.has(i)) {
          end = i;
          break;
        }
      }
    }

    const chunk = words.slice(start, end).join(' ').trim();
    if (chunk) chunks.push(chunk);

    if (end >= words.length) break;
    // Overlap is measured back from the chunk that was actually emitted, so a
    // paragraph snap shortens the chunk without re-reading text from before
    // the boundary. `start + 1` guarantees forward progress in every case.
    start = Math.max(end - overlapWords, start + 1);
  }

  return chunks;
}
