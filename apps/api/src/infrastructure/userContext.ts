import type { FastifyRequest } from 'fastify';

import {
  DEVELOPMENT_USER_PUBLIC_ID,
  ensureDevelopmentUser,
} from './developmentUser.js';

/**
 * Resolves the acting user's publicId for a request: the authenticated user
 * (JWT `sub`) when present, otherwise the dev user (kept as a fallback during
 * the multi-user transition so unauthenticated clients keep working).
 */
export async function resolveUserPublicId(
  request: FastifyRequest,
): Promise<string> {
  const sub = request.user?.sub;
  if (sub) {
    return sub;
  }

  await ensureDevelopmentUser();
  return DEVELOPMENT_USER_PUBLIC_ID;
}
