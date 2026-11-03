import { prisma } from './prisma.js';

/** Database boundary for credential validation; deleted accounts cannot keep using tokens. */
export function findSessionUser(publicId: string) {
  return prisma.user.findUnique({
    where: { publicId },
    select: {
      publicId: true, displayName: true, email: true, avatarUrl: true,
      createdAt: true, updatedAt: true,
    },
  });
}
