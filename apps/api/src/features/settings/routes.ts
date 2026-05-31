import type { FastifyInstance } from 'fastify';

import { resolveUserPublicId } from '../../infrastructure/userContext.js';
import { getUserSettings, updateUserSettings } from './repository.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get('/settings', async (request) => {
    return getUserSettings(await resolveUserPublicId(request));
  });

  app.put<{ Body: unknown }>('/settings', async (request, reply) => {
    const body = request.body;

    if (!isRecord(body)) {
      return reply.code(400).send({ message: 'Invalid settings payload' });
    }

    const unit =
      body.unit === 'kg' || body.unit === 'lb' ? body.unit : undefined;
    const defaultRestSeconds =
      typeof body.defaultRestSeconds === 'number' &&
      Number.isInteger(body.defaultRestSeconds) &&
      body.defaultRestSeconds > 0
        ? body.defaultRestSeconds
        : undefined;

    return updateUserSettings(await resolveUserPublicId(request), {
      unit,
      defaultRestSeconds,
    });
  });
}
