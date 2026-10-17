import type { FastifyInstance, FastifyReply } from 'fastify';

import {
  addFavoriteExercise,
  createExercise,
  deleteCustomExercise,
  deleteExercisePhoto,
  findExerciseById,
  findExercisePhoto,
  getExerciseDeletionImpact,
  InvalidMuscleGroupSelectionError,
  listExercises,
  listFavoriteExerciseIds,
  listMuscleGroups,
  removeFavoriteExercise,
  saveExercisePhoto,
  setExerciseUnilateral,
} from './repository.js';
import { decodeJpegBase64 } from '../profile/validation.js';
import { parseInActiveWorkoutFlag } from './deletion.js';
import { isExerciseTrackingType } from './trackingTypes.js';
import { resolveUserPublicId } from '../../infrastructure/userContext.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0)
  );
}

function parseCreateExerciseInput(body: unknown) {
  if (
    !isRecord(body) ||
    typeof body.name !== 'string' ||
    !body.name.trim() ||
    !isStringArray(body.primaryMuscleGroupIds) ||
    !isStringArray(body.secondaryMuscleGroupIds) ||
    (body.trackingType !== undefined && !isExerciseTrackingType(body.trackingType)) ||
    (body.isUnilateral !== undefined && typeof body.isUnilateral !== 'boolean')
  ) {
    return null;
  }

  return {
    name: body.name.trim(),
    primaryMuscleGroupIds: body.primaryMuscleGroupIds.map((id) => id.trim()),
    secondaryMuscleGroupIds: body.secondaryMuscleGroupIds.map((id) => id.trim()),
    trackingType: body.trackingType,
    isUnilateral: body.isUnilateral,
  };
}

function sendPhotoWriteResult(
  reply: FastifyReply,
  result: 'ok' | 'not-found' | 'forbidden',
) {
  if (result === 'not-found') {
    return reply.code(404).send({ message: 'Exercise not found' });
  }

  if (result === 'forbidden') {
    return reply.code(403).send({ message: 'Only the creator can change the photo' });
  }

  return reply.code(204).send();
}

/**
 * Spec 0033: someone else's custom exercise answers exactly like an unknown
 * one (FR-2, EF-3); a catalog exercise exists for everyone but is nobody's to
 * delete. Returns `undefined` when the request was not refused.
 */
function sendDeletionRefusal(reply: FastifyReply, result: unknown) {
  if (result === 'not-found') {
    return reply.code(404).send({ message: 'Exercise not found' });
  }

  if (result === 'forbidden') {
    return reply.code(403).send({ message: 'Catalog exercises cannot be deleted' });
  }

  return undefined;
}

export async function registerExerciseRoutes(app: FastifyInstance) {
  // Catalog plus the acting person's own custom exercises (spec 0015).
  app.get('/exercises', async (request) => {
    return listExercises(await resolveUserPublicId(request));
  });

  app.get('/muscle-groups', async () => {
    return listMuscleGroups();
  });

  app.get('/exercises/favorites', async (request) => {
    return listFavoriteExerciseIds(await resolveUserPublicId(request));
  });

  app.put<{ Params: { id: string } }>(
    '/exercises/:id/favorite',
    async (request, reply) => {
      const ok = await addFavoriteExercise(
        await resolveUserPublicId(request),
        request.params.id,
      );

      if (!ok) {
        return reply.code(404).send({ message: 'Exercise not found' });
      }

      return reply.code(204).send();
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/exercises/:id/favorite',
    async (request, reply) => {
      await removeFavoriteExercise(
        await resolveUserPublicId(request),
        request.params.id,
      );
      return reply.code(204).send();
    },
  );

  // Spec 0033: what deleting the creator's custom exercise touches (FR-3).
  app.get<{ Params: { id: string } }>(
    '/exercises/:id/deletion-impact',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const result = await getExerciseDeletionImpact(
        await resolveUserPublicId(request),
        request.params.id,
      );

      return sendDeletionRefusal(reply, result) ?? result;
    },
  );

  // Spec 0033: delete the creator's custom exercise; already deleted is done (EF-2).
  app.delete<{ Params: { id: string }; Querystring: { inActiveWorkout?: string } }>(
    '/exercises/:id',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const result = await deleteCustomExercise(
        await resolveUserPublicId(request),
        request.params.id,
        { inActiveWorkout: parseInActiveWorkoutFlag(request.query.inActiveWorkout) },
      );

      return sendDeletionRefusal(reply, result) ?? reply.code(204).send();
    },
  );

  app.post<{ Body: unknown }>('/exercises', async (request, reply) => {
    const input = parseCreateExerciseInput(request.body);

    if (!input) {
      return reply.code(400).send({
        message: 'Invalid exercise payload',
      });
    }

    try {
      const exercise = await createExercise(
        await resolveUserPublicId(request),
        input,
      );

      return reply.code(201).send(exercise);
    } catch (error) {
      if (error instanceof InvalidMuscleGroupSelectionError) {
        return reply.code(400).send({
          message: error.message,
        });
      }

      throw error;
    }
  });

  app.put<{ Params: { id: string }; Body: unknown }>(
    '/exercises/:id/unilateral',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const body = request.body;
      if (!isRecord(body) || typeof body.isUnilateral !== 'boolean') {
        return reply.code(400).send({ message: 'Invalid exercise payload' });
      }

      const result = await setExerciseUnilateral(
        await resolveUserPublicId(request),
        request.params.id,
        body.isUnilateral,
      );

      // Someone else's custom exercise is "not found" too (spec 0015 FR-2).
      if (result === 'not-found') {
        return reply.code(404).send({ message: 'Exercise not found' });
      }

      return result;
    },
  );

  // Same upload shape as the profile photo (spec 0027): a small JPEG, base64.
  app.put<{ Params: { id: string }; Body: unknown }>(
    '/exercises/:id/photo',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const photo = decodeJpegBase64(request.body);

      if (!photo.ok) {
        return reply.code(photo.status).send({ message: photo.message });
      }

      const result = await saveExercisePhoto(
        await resolveUserPublicId(request),
        request.params.id,
        photo.bytes,
      );

      return sendPhotoWriteResult(reply, result);
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/exercises/:id/photo',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const result = await deleteExercisePhoto(
        await resolveUserPublicId(request),
        request.params.id,
      );

      return sendPhotoWriteResult(reply, result);
    },
  );

  // Only exercises the person can see (spec 0015 FR-13): in practice the creator.
  app.get<{ Params: { id: string } }>(
    '/exercises/:id/photo',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const photo = await findExercisePhoto(
        await resolveUserPublicId(request),
        request.params.id,
      );

      if (!photo) {
        return reply.code(404).send({ message: 'Photo not found' });
      }

      return reply
        .header('Content-Type', 'image/jpeg')
        .header('Cache-Control', 'private, max-age=31536000, immutable')
        .header('X-Content-Type-Options', 'nosniff')
        .send(photo.data);
    },
  );

  app.get<{ Params: { id: string } }>('/exercises/:id', async (request, reply) => {
    const exercise = await findExerciseById(
      await resolveUserPublicId(request),
      request.params.id,
    );

    if (!exercise) {
      return reply.code(404).send({
        message: 'Exercise not found',
      });
    }

    return exercise;
  });
}
