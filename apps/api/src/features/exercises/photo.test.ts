import { describe, expect, it } from 'vitest';

import { matchesImageSignature, photoImageUrl } from './photo.js';

describe('matchesImageSignature', () => {
  it('accepts real signatures and rejects mismatches', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    const webp = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WEBPVP8 '),
    ]);

    expect(matchesImageSignature(jpeg, 'image/jpeg')).toBe(true);
    expect(matchesImageSignature(jpeg, 'image/png')).toBe(false);
    expect(matchesImageSignature(webp, 'image/webp')).toBe(true);
    expect(matchesImageSignature(Buffer.from('<html>'), 'image/jpeg')).toBe(false);
  });
});

describe('photoImageUrl', () => {
  it('is relative and versioned by the update time', () => {
    expect(photoImageUrl('abc', new Date(1234))).toBe('/exercises/abc/photo?v=1234');
  });
});
