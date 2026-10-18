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
    // `null` clears the override (follow device); 'en'/'es' set it; anything
    // else (incl. absent) leaves it unchanged.
    const language =
      body.language === 'en' || body.language === 'es' || body.language === null
        ? body.language
        : undefined;

    // 'system' | 'light' | 'dark' (spec 0038); anything else leaves it unchanged.
    const appearance =
      body.appearance === 'system' || body.appearance === 'light' || body.appearance === 'dark'
        ? body.appearance
        : undefined;

    return updateUserSettings(await resolveUserPublicId(request), {
      unit,
      defaultRestSeconds,
      language,
      appearance,
    });
  });
}
