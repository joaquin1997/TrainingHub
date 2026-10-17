import { describe, expect, it } from 'vitest';

import { photoImageUrl } from './photo.js';

describe('photoImageUrl', () => {
  it('is relative and versioned by the update time', () => {
    expect(photoImageUrl('abc', new Date(1234))).toBe('/exercises/abc/photo?v=1234');
  });
});
