import type { FastifyInstance } from 'fastify';

import { resolveUserPublicId } from '../../infrastructure/userContext.js';
import { isExerciseTrackingType } from './trackingTypes.js';
import { setExerciseTrackingType } from './trackingTypeRepository.js';

/** `PUT /exercises/:id/tracking-type` (spec 0030 FR-12): change the type by hand. */
export async function registerExerciseTrackingTypeRoutes(app: FastifyInstance) {
  app.put<{ Params: { id: string }; Body: unknown }>(
    '/exercises/:id/tracking-type',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const trackingType =
        typeof request.body === 'object' && request.body !== null
          ? (request.body as Record<string, unknown>).trackingType
          : undefined;
      if (!isExerciseTrackingType(trackingType)) {
        return reply.code(400).send({ message: 'Invalid exercise payload' });
      }

      const result = await setExerciseTrackingType(
        await resolveUserPublicId(request),
        request.params.id,
        trackingType,
      );

      if (result === 'not-found') {
        return reply.code(404).send({ message: 'Exercise not found' });
      }

      return result;
    },
  );
}
