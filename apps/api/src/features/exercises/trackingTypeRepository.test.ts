import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../infrastructure/prisma.js', () => ({
  prisma: { exercise: { findUnique, update } },
}));

vi.mock('./repository.js', () => ({
  findExerciseById: vi.fn(async (_userId: string, id: string) => ({ id, trackingType: 'duration' })),
}));

import { setExerciseTrackingType } from './trackingTypeRepository.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('setExerciseTrackingType (spec 0030)', () => {
  it('marks a catalog exercise as set by a person, whoever is signed in (FR-13)', async () => {
    findUnique.mockResolvedValue({ id: 7n, isSystemDefined: true, createdByUser: null });

    const result = await setExerciseTrackingType('someone', 'e1', 'duration');

    expect(update).toHaveBeenCalledWith({
      where: { id: 7n },
      data: { trackingType: 'duration', trackingTypeSetBy: 'person' },
    });
    expect(result).toMatchObject({ id: 'e1', trackingType: 'duration' });
  });

  it('lets the creator change a custom exercise', async () => {
    findUnique.mockResolvedValue({
      id: 8n,
      isSystemDefined: false,
      createdByUser: { publicId: 'owner' },
    });

    await setExerciseTrackingType('owner', 'e2', 'reps');

    expect(update).toHaveBeenCalledOnce();
  });

  it("treats someone else's custom exercise as not found and never writes (EF-6, 0015)", async () => {
    findUnique.mockResolvedValue({
      id: 8n,
      isSystemDefined: false,
      createdByUser: { publicId: 'owner' },
    });

    expect(await setExerciseTrackingType('intruder', 'e2', 'reps')).toBe('not-found');
    expect(update).not.toHaveBeenCalled();
  });

  it('reports a missing exercise', async () => {
    findUnique.mockResolvedValue(null);

    expect(await setExerciseTrackingType('someone', 'nope', 'reps')).toBe('not-found');
    expect(update).not.toHaveBeenCalled();
  });
});
