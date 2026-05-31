import { prisma } from '../../infrastructure/prisma.js';
import type {
  AppLanguage,
  UpdateUserSettingsInput,
  UserSettings,
  WeightUnit,
} from '@workout/domain';

function toUnit(value: string): WeightUnit {
  return value === 'lb' ? 'lb' : 'kg';
}

function toLanguage(value: string | null): AppLanguage | null {
  return value === 'en' || value === 'es' ? value : null;
}

export async function getUserSettings(
  userPublicId: string,
): Promise<UserSettings> {
  const user = await prisma.user.findUnique({
    where: { publicId: userPublicId },
    select: { unit: true, defaultRestSeconds: true, language: true },
  });

  return {
    unit: toUnit(user?.unit ?? 'kg'),
    defaultRestSeconds: user?.defaultRestSeconds ?? 90,
    language: toLanguage(user?.language ?? null),
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
      language: input.language,
    },
    select: { unit: true, defaultRestSeconds: true, language: true },
  });

  return {
    unit: toUnit(user.unit),
    defaultRestSeconds: user.defaultRestSeconds,
    language: toLanguage(user.language),
  };
}
