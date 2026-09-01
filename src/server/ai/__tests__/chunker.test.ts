import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chunkText, normaliseText } from '../indexing/chunker';

const OPTIONS = { chunkWords: 500, overlapWords: 100 };
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('normaliseText', () => {
  it('collapses runs of spaces and tabs', () => {
    assert.equal(normaliseText('a   b\t\tc'), 'a b c');
  });

  it('strips C0 control characters but keeps newlines', () => {
    const input = `a${String.fromCharCode(0)}${String.fromCharCode(7)}b\nc`;
    assert.equal(normaliseText(input), 'ab\nc');
  });

  it('normalises CRLF and collapses blank-line runs', () => {
    assert.equal(normaliseText('a\r\n\r\n\r\n\r\nb'), 'a\n\nb');
  });

  it('returns an empty string for whitespace-only input', () => {
    assert.equal(normaliseText('   \n\t  '), '');
  });
});

describe('chunkText', () => {
  it('returns a single chunk when the text fits the window', () => {
    const chunks = chunkText(words(100), OPTIONS);
    assert.equal(chunks.length, 1);
  });

  it('returns no chunks for empty input', () => {
    assert.deepEqual(chunkText('   ', OPTIONS), []);
  });

  it('splits long text into windows of the configured size', () => {
    const chunks = chunkText(words(1200), OPTIONS);
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0].split(' ').length, 500);
    assert.equal(chunks[1].split(' ').length, 500);
  });

  it('overlaps consecutive chunks by the configured word count', () => {
    const chunks = chunkText(words(1200), OPTIONS);
    const first = chunks[0].split(' ');
    const second = chunks[1].split(' ');
    // The last `overlapWords` of chunk N are the first words of chunk N+1.
    assert.deepEqual(first.slice(-100), second.slice(0, 100));
  });

  it('covers every word of the source across the chunks', () => {
    const chunks = chunkText(words(1200), OPTIONS);
    const seen = new Set(chunks.flatMap((c) => c.split(' ')));
    assert.equal(seen.size, 1200);
  });

  it('prefers a paragraph boundary near the end of a window', () => {
    // Paragraph break at word 460 sits in the final quarter of a 500-word
    // window, so the chunk should end there rather than mid-paragraph.
    const text = `${words(460)}\n\n${Array.from({ length: 600 }, (_, i) => `x${i}`).join(' ')}`;
    const chunks = chunkText(text, OPTIONS);
    assert.equal(chunks[0].split(' ').length, 460);
    assert.equal(chunks[0].split(' ').at(-1), 'w459');
    // The next chunk overlaps the tail of the emitted chunk (not the tail of
    // the nominal 500-word window), so it starts `overlapWords` before the
    // boundary and still reaches the new paragraph.
    const second = chunks[1].split(' ');
    assert.equal(second[0], 'w360');
    assert.ok(second.includes('x0'));
  });

  it('hard-splits a paragraph that exceeds the window on its own', () => {
    const chunks = chunkText(words(2000), OPTIONS);
    for (const chunk of chunks) {
      assert.ok(chunk.split(' ').length <= 500);
    }
  });

  it('always advances, even with a degenerate overlap setting', () => {
    // overlap >= chunk size would loop forever if not clamped.
    const chunks = chunkText(words(700), { chunkWords: 100, overlapWords: 500 });
    assert.ok(chunks.length > 1);
    assert.ok(chunks.length < 200);
  });

  it('enforces a minimum window size', () => {
    const chunks = chunkText(words(300), { chunkWords: 1, overlapWords: 0 });
    // chunkWords is floored at 50, so 300 words cannot become 300 chunks.
    assert.ok(chunks.length <= 6);
  });
});
