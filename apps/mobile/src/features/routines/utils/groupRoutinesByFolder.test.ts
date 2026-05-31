import { describe, expect, it } from 'vitest';

import { groupRoutinesByFolder } from './groupRoutinesByFolder';
import type { Routine } from '@workout/domain';

function routine(id: string, folder?: string): Routine {
  return {
    id,
    userId: 'u1',
    name: id,
    folder,
    exercises: [],
    createdAt: '',
    updatedAt: '',
  };
}

describe('groupRoutinesByFolder', () => {
  it('groups by folder, alphabetical, with the unfiled bucket last', () => {
    const groups = groupRoutinesByFolder([
      routine('a', 'Pull'),
      routine('b'),
      routine('c', 'Legs'),
      routine('d', 'Pull'),
    ]);

    expect(groups.map((group) => group.folder)).toEqual([
      'Legs',
      'Pull',
      undefined,
    ]);
    expect(groups[1]!.routines.map((r) => r.id)).toEqual(['a', 'd']);
  });

  it('treats blank folders as unfiled', () => {
    const groups = groupRoutinesByFolder([routine('a', '   ')]);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.folder).toBeUndefined();
  });
});
