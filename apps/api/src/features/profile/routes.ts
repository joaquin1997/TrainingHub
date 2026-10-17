import type { FastifyInstance } from 'fastify';

import { resolveUserPublicId } from '../../infrastructure/userContext.js';
import { getProfile, setProfilePhoto, updateProfile } from './repository.js';
import { decodeJpegBase64, parseProfileUpdate } from './validation.js';

/** The signed-in person's own profile (spec 0027); always owner-scoped. */
export async function registerProfileRoutes(app: FastifyInstance) {
  app.get('/profile', async (request, reply) => {
    const profile = await getProfile(await resolveUserPublicId(request));
    if (!profile) {
      return reply.code(404).send({ message: 'User not found' });
    }
    return profile;
  });

  app.put<{ Body: unknown }>('/profile', async (request, reply) => {
    const parsed = parseProfileUpdate(request.body);
    if (!parsed.ok) {
      return reply.code(400).send(parsed.error);
    }
    return updateProfile(await resolveUserPublicId(request), parsed.value);
  });

  app.put<{ Body: unknown }>('/profile/photo', async (request, reply) => {
    const photo = decodeJpegBase64(request.body);
    if (!photo.ok) {
      return reply.code(photo.status).send({ message: photo.message });
    }
    return setProfilePhoto(await resolveUserPublicId(request), photo.bytes);
  });

  app.delete('/profile/photo', async (request) => {
    return setProfilePhoto(await resolveUserPublicId(request), null);
  });
}
