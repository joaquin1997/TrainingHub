import type { FastifyInstance } from 'fastify';

import { resolveUserPublicId } from '../../infrastructure/userContext.js';
import {
  createMeasurement,
  deleteMeasurement,
  listMeasurements,
  updateMeasurement,
} from './repository.js';
import { parseMeasurementInput } from './validation.js';

/** Body measurement entries (spec 0027); private to their owner (FR-8). */
export async function registerMeasurementRoutes(app: FastifyInstance) {
  app.get('/measurements', async (request) => {
    return listMeasurements(await resolveUserPublicId(request));
  });

  app.post<{ Body: unknown }>('/measurements', async (request, reply) => {
    const parsed = parseMeasurementInput(request.body);
    if (!parsed.ok) {
      return reply.code(400).send(parsed.error);
    }
    const entry = await createMeasurement(await resolveUserPublicId(request), parsed.value);
    return reply.code(201).send(entry);
  });

  app.put<{ Params: { entryId: string }; Body: unknown }>(
    '/measurements/:entryId',
    async (request, reply) => {
      const parsed = parseMeasurementInput(request.body);
      if (!parsed.ok) {
        return reply.code(400).send(parsed.error);
      }
      const entry = await updateMeasurement(
        await resolveUserPublicId(request),
        request.params.entryId,
        parsed.value,
      );
      if (!entry) {
        return reply.code(404).send({ message: 'Measurement not found' });
      }
      return entry;
    },
  );

  app.delete<{ Params: { entryId: string } }>(
    '/measurements/:entryId',
    async (request, reply) => {
      const deleted = await deleteMeasurement(
        await resolveUserPublicId(request),
        request.params.entryId,
      );
      if (!deleted) {
        return reply.code(404).send({ message: 'Measurement not found' });
      }
      return reply.code(204).send();
    },
  );
}
