import { prisma } from '../../infrastructure/prisma.js';
import type {
  UpdateUserSettingsInput,
  UserSettings,
  WeightUnit,
} from '@workout/domain';

function toUnit(value: string): WeightUnit {
  return value === 'lb' ? 'lb' : 'kg';
}

export async function getUserSettings(
  userPublicId: string,
): Promise<UserSettings> {
  const user = await prisma.user.findUnique({
    where: { publicId: userPublicId },
    select: { unit: true, defaultRestSeconds: true },
  });

  return {
    unit: toUnit(user?.unit ?? 'kg'),
    defaultRestSeconds: user?.defaultRestSeconds ?? 90,
  };
}

export async function updateUserSettings(
  userPublicId: string,
  input: UpdateUserSettingsInput,
): Promise<UserSettings> {
  const user = await prisma.user.update({
    where: { publicId: userPublicId },
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
