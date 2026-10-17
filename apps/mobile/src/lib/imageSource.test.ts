import { describe, expect, it } from 'vitest';

import { resolveImageSource } from './imageSource';

describe('resolveImageSource', () => {
  it('uses absolute URLs as they are, without credentials', () => {
    expect(resolveImageSource('https://example.com/a.jpg', 'http://api', 't')).toEqual({
      uri: 'https://example.com/a.jpg',
    });
  });

  it('resolves API-relative URLs with the bearer token', () => {
    expect(resolveImageSource('/exercises/e1/photo?v=1', 'http://api/', 'tok')).toEqual({
      uri: 'http://api/exercises/e1/photo?v=1',
      headers: { Authorization: 'Bearer tok' },
    });
  });

  it('has no source for a relative URL when signed out', () => {
    expect(resolveImageSource('/exercises/e1/photo', 'http://api', null)).toBeNull();
  });

  it('ignores anything else', () => {
    expect(resolveImageSource('javascript:alert(1)', 'http://api', 't')).toBeNull();
  });
});
