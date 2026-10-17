import { describe, expect, it } from 'vitest';

import { squareCrop } from './squareCrop';

describe('squareCrop', () => {
  it('centres the square on a landscape photo', () => {
    expect(squareCrop(4032, 3024)).toEqual({ originX: 504, originY: 0, width: 3024, height: 3024 });
  });

  it('centres the square on a portrait photo', () => {
    expect(squareCrop(1000, 1500)).toEqual({ originX: 0, originY: 250, width: 1000, height: 1000 });
  });

  it('keeps a square photo whole', () => {
    expect(squareCrop(800, 800)).toEqual({ originX: 0, originY: 0, width: 800, height: 800 });
  });
});
