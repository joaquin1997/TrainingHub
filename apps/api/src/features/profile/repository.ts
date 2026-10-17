import type { UpdateUserProfileInput, UserProfile } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';

const profileSelect = {
  displayName: true,
  email: true,
  bio: true,
  heightCm: true,
  photo: true,
} as const;

type ProfileRow = {
  displayName: string;
  email: string | null;
  bio: string | null;
  heightCm: number | null;
  photo: Uint8Array | null;
};

export function mapProfile(row: ProfileRow): UserProfile {
  return {
    displayName: row.displayName,
    email: row.email,
    bio: row.bio,
    heightCm: row.heightCm,
    photoDataUrl: row.photo
      ? `data:image/jpeg;base64,${Buffer.from(row.photo).toString('base64')}`
      : null,
  };
}

export async function getProfile(userPublicId: string): Promise<UserProfile | null> {
  const row = await prisma.user.findUnique({
    where: { publicId: userPublicId },
    select: profileSelect,
  });
  return row ? mapProfile(row) : null;
}

export async function updateProfile(
  userPublicId: string,
  input: UpdateUserProfileInput,
): Promise<UserProfile> {
  const row = await prisma.user.update({
    where: { publicId: userPublicId },
    data: {
      displayName: input.displayName,
      bio: input.bio,
      heightCm: input.heightCm,
    },
    select: profileSelect,
  });
  return mapProfile(row);
}

/** Sets (JPEG bytes) or removes (`null`) the profile photo. */
export async function setProfilePhoto(
  userPublicId: string,
  photo: Uint8Array | null,
): Promise<UserProfile> {
  const row = await prisma.user.update({
    where: { publicId: userPublicId },
    data: { photo },
    select: profileSelect,
  });
  return mapProfile(row);
}
