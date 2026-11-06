import type { FastifyInstance } from 'fastify';
import type { ExerciseWarmUpPreferences } from '@workout/domain';

import { resolveUserPublicId } from '../../infrastructure/userContext.js';
import { exerciseWarmUpPreferences } from './warmUpPreferencesRepository.js';

export function parseWarmUpPreferences(value: unknown): ExerciseWarmUpPreferences | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some((key) => !['loadingKind', 'approachSetCount', 'incrementKg'].includes(key))) return null;
  const { loadingKind, approachSetCount, incrementKg } = data;
  if (loadingKind !== null && !['barbell', 'dumbbell', 'machine'].includes(loadingKind as string)) return null;
  if (approachSetCount !== null && !(typeof approachSetCount === 'number' && Number.isInteger(approachSetCount) && approachSetCount >= 1 && approachSetCount <= 5)) return null;
  if (incrementKg !== null && !(typeof incrementKg === 'number' && Number.isFinite(incrementKg) && incrementKg > 0)) return null;
  return { loadingKind, approachSetCount, incrementKg } as ExerciseWarmUpPreferences;
}

export async function registerWarmUpPreferencesRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/exercises/:id/warm-up-preferences', async (request, reply) => {
    const result = await exerciseWarmUpPreferences(await resolveUserPublicId(request), request.params.id);
    return result ?? reply.code(404).send({ message: 'Exercise not found' });
  });
  app.put<{ Params: { id: string }; Body: unknown }>('/exercises/:id/warm-up-preferences', async (request, reply) => {
    const input = parseWarmUpPreferences(request.body);
    if (!input) return reply.code(400).send({ message: 'Invalid warm-up preferences' });
    const result = await exerciseWarmUpPreferences(await resolveUserPublicId(request), request.params.id, input);
    return result ?? reply.code(404).send({ message: 'Exercise not found' });
  });
}
