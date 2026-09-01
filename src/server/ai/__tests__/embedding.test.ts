import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashContent } from '../indexing/embedding-service';

describe('hashContent', () => {
  it('is deterministic for identical input', () => {
    assert.equal(hashContent('a', 'b'), hashContent('a', 'b'));
  });

  it('changes when any part of the content changes', () => {
    assert.notEqual(hashContent('title', 'body'), hashContent('title', 'body edited'));
    assert.notEqual(hashContent('title', 'body'), hashContent('title edited', 'body'));
  });

  it('produces a hex sha-256 digest', () => {
    assert.match(hashContent('x'), /^[0-9a-f]{64}$/);
  });

  it('distinguishes different groupings of the same characters', () => {
    // Guards the skip-if-unchanged path against a trivial collision.
    assert.notEqual(hashContent('ab', 'c'), hashContent('a', 'bc'));
  });
});
