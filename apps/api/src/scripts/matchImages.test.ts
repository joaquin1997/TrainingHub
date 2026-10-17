import { describe, expect, it } from 'vitest';

import { imageUrlFor, matchImages, normalizeName } from './matchImages.js';

const dataset = [
  { name: 'Bulgarian Split Squat', images: ['Bulgarian_Split_Squat/0.jpg', 'x/1.jpg'] },
  { name: 'Barbell Curl', images: ['Barbell_Curl/0.jpg'] },
  { name: 'No Image', images: [] },
  { name: 'Twin', images: ['Twin_A/0.jpg'] },
  { name: 'twin', images: ['Twin_B/0.jpg'] },
];

describe('normalizeName', () => {
  it('ignores case, accents, punctuation and plurals', () => {
    expect(normalizeName('Bulgarian  Split-Squats')).toBe('bulgarian split squat');
    expect(normalizeName('Prensa Atlética')).toBe('prensa atletica');
    expect(normalizeName('Glute Bridge')).toBe('glute bridge');
  });
});

describe('matchImages', () => {
  it('matches by normalised name using the first image', () => {
    const { matched, unmatched } = matchImages(
      [
        { id: 1n, name: 'bulgarian split squats' },
        { id: 2n, name: 'Unknown lift' },
      ],
      dataset,
    );

    expect(matched).toEqual([
      {
        id: 1n,
        name: 'bulgarian split squats',
        matchedName: 'Bulgarian Split Squat',
        imageUrl:
          'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bulgarian_Split_Squat/0.jpg',
      },
    ]);
    expect(unmatched.map((e) => e.id)).toEqual([2n]);
  });

  it('uses reviewed aliases', () => {
    const { matched } = matchImages([{ id: 3n, name: 'Curl con barra' }], dataset, {
      'Curl con barra': 'Barbell Curl',
    });
    expect(matched[0]?.imageUrl).toContain('Barbell_Curl/0.jpg');
  });

  it('tries the alternative names of the exercise', () => {
    const { matched } = matchImages(
      [{ id: 6n, name: 'Curl con barra', altNames: ['Barbell Curl'] }],
      dataset,
    );
    expect(matched[0]?.matchedName).toBe('Barbell Curl');
  });

  it('skips dataset entries without images and ambiguous names', () => {
    const { matched, unmatched } = matchImages(
      [
        { id: 4n, name: 'No Image' },
        { id: 5n, name: 'Twin' },
      ],
      dataset,
    );
    expect(matched).toEqual([]);
    expect(unmatched).toHaveLength(2);
  });
});

describe('imageUrlFor', () => {
  it('encodes path segments', () => {
    expect(imageUrlFor('A B/0.jpg')).toContain('A%20B/0.jpg');
  });
});
