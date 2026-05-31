import { prisma } from '../../infrastructure/prisma.js';
import {
  DEVELOPMENT_USER_PUBLIC_ID,
  ensureDevelopmentUser,
} from '../../infrastructure/developmentUser.js';
import type {
  UpdateUserSettingsInput,
  UserSettings,
  WeightUnit,
} from '@workout/domain';

function toUnit(value: string): WeightUnit {
  return value === 'lb' ? 'lb' : 'kg';
}

// TODO: scope to the authenticated user once auth lands; uses the dev user for now.
export async function getUserSettings(): Promise<UserSettings> {
  await ensureDevelopmentUser();

  const user = await prisma.user.findUnique({
    where: { publicId: DEVELOPMENT_USER_PUBLIC_ID },
    select: { unit: true, defaultRestSeconds: true },
  });

  return {
    unit: toUnit(user?.unit ?? 'kg'),
    defaultRestSeconds: user?.defaultRestSeconds ?? 90,
  };
}

export async function updateUserSettings(
  input: UpdateUserSettingsInput,
): Promise<UserSettings> {
  await ensureDevelopmentUser();

  const user = await prisma.user.update({
    where: { publicId: DEVELOPMENT_USER_PUBLIC_ID },
    data: {
      unit: input.unit,
      defaultRestSeconds: input.defaultRestSeconds,
    },
    select: { unit: true, defaultRestSeconds: true },
  });

  return {
    unit: toUnit(user.unit),
    defaultRestSeconds: user.defaultRestSeconds,
  };
}
