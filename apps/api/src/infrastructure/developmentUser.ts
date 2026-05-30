import { prisma } from './prisma.js';

/**
 * Placeholder user used by every repository until real authentication lands.
 * Centralized here so all features reference the same dev user.
 */
export const DEVELOPMENT_USER_PUBLIC_ID = 'user-development';

export async function ensureDevelopmentUser() {
  await prisma.user.upsert({
    where: { publicId: DEVELOPMENT_USER_PUBLIC_ID },
    update: {},
    create: {
      publicId: DEVELOPMENT_USER_PUBLIC_ID,
      displayName: 'Development User',
      email: 'dev-user@example.com',
    },
  });
}
