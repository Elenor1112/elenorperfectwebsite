import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { __resetRateLimits, checkRateLimit } from '../chat/rate-limit';

const OPTIONS = { limit: 3, windowMs: 1000 };

describe('checkRateLimit', () => {
  beforeEach(() => __resetRateLimits());

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 3; i += 1) {
      assert.equal(checkRateLimit('a', OPTIONS).allowed, true);
    }
  });

  it('blocks the request after the limit is exhausted', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('a', OPTIONS);
    const result = checkRateLimit('a', OPTIONS);
    assert.equal(result.allowed, false);
    assert.ok(result.retryAfterSeconds >= 1);
  });

  it('counts down the remaining allowance', () => {
    assert.equal(checkRateLimit('a', OPTIONS).remaining, 2);
    assert.equal(checkRateLimit('a', OPTIONS).remaining, 1);
    assert.equal(checkRateLimit('a', OPTIONS).remaining, 0);
  });

  it('tracks each key independently', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('a', OPTIONS);
    assert.equal(checkRateLimit('a', OPTIONS).allowed, false);
    assert.equal(checkRateLimit('b', OPTIONS).allowed, true);
  });

  it('starts a fresh window once the previous one expires', async () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('a', { limit: 3, windowMs: 20 });
    assert.equal(checkRateLimit('a', { limit: 3, windowMs: 20 }).allowed, false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(checkRateLimit('a', { limit: 3, windowMs: 20 }).allowed, true);
  });
});
