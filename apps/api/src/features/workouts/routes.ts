import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import type {
  CreateWorkoutSessionInput,
  WorkoutExerciseInput,
  WorkoutSetInput,
  WorkoutSetType,
} from '@workout/domain';

const WORKOUT_SET_TYPES: WorkoutSetType[] = [
  'normal',
  'warmup',
  'drop',
  'failure',
];

function parseWorkoutSetType(value: unknown): WorkoutSetType | undefined {
  return typeof value === 'string' &&
    (WORKOUT_SET_TYPES as string[]).includes(value)
    ? (value as WorkoutSetType)
    : undefined;
}

import {
  createWorkoutSession,
  findWorkoutSessionById,
  getExerciseLastPerformance,
  listWorkoutSessions,
} from './repository.js';
import { UnknownExerciseError } from './saveReferences.js';
import { resolveUserPublicId } from '../../infrastructure/userContext.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isReadableTime(value: string) {
  return !Number.isNaN(Date.parse(value));
}

/** Why the workout's times are unacceptable, or undefined when they are fine. */
function workoutTimesProblem(input: CreateWorkoutSessionInput) {
  const setTimes = input.exercises.flatMap((exercise) =>
    exercise.sets.flatMap((set) => (set.completedAt ? [set.completedAt] : [])),
  );
  const times = [
    input.startedAt,
    ...(input.completedAt ? [input.completedAt] : []),
    ...setTimes,
  ];

  if (!times.every(isReadableTime)) {
    return 'Workout times must be valid dates';
  }

  if (
    input.completedAt &&
    Date.parse(input.completedAt) < Date.parse(input.startedAt)
  ) {
    return 'A workout cannot end before it starts';
  }

  return undefined;
}

/** Longest accepted `clientId` (spec 0014); the app sends far fewer. */
const MAX_CLIENT_ID_LENGTH = 64;

function parseOptionalInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

function parseWorkoutSetInput(
  value: unknown,
  fallbackOrder: number,
): WorkoutSetInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const completedAt = parseOptionalString(value.completedAt);

  return {
    order: parseOptionalInteger(value.order) ?? fallbackOrder,
    type: parseWorkoutSetType(value.type),
    reps: parseOptionalInteger(value.reps),
    weightKg: parseOptionalNumber(value.weightKg),
    durationSeconds: parseOptionalInteger(value.durationSeconds),
    distanceMeters: parseOptionalNumber(value.distanceMeters),
    restSeconds: parseOptionalInteger(value.restSeconds),
    isWarmup: typeof value.isWarmup === 'boolean' ? value.isWarmup : undefined,
    completedAt,
  };
}

function parseWorkoutExerciseInput(
  value: unknown,
  fallbackOrder: number,
): WorkoutExerciseInput | null {
  if (
    !isRecord(value) ||
    typeof value.exerciseId !== 'string' ||
    !value.exerciseId.trim()
  ) {
    return null;
  }

  const setsInput = Array.isArray(value.sets) ? value.sets : [];
  const sets = setsInput
    .map((set, index) => parseWorkoutSetInput(set, index + 1))
    .filter((set): set is WorkoutSetInput => set !== null);

  if (sets.length !== setsInput.length) {
    return null;
  }

  return {
    exerciseId: value.exerciseId.trim(),
    routineExerciseId: parseOptionalString(value.routineExerciseId),
    order: parseOptionalInteger(value.order) ?? fallbackOrder,
    notes: parseOptionalString(value.notes),
    sets,
  };
}

function parseCreateWorkoutSessionInput(
  body: unknown,
): CreateWorkoutSessionInput | null {
  if (
    !isRecord(body) ||
    typeof body.startedAt !== 'string' ||
    !body.startedAt.trim()
  ) {
    return null;
  }

  const completedAt = parseOptionalString(body.completedAt);

  const clientId = parseOptionalString(body.clientId);
  if (clientId && clientId.length > MAX_CLIENT_ID_LENGTH) {
    return null;
  }

  const exercisesInput = Array.isArray(body.exercises) ? body.exercises : [];
  const exercises = exercisesInput
    .map((exercise, index) => parseWorkoutExerciseInput(exercise, index + 1))
    .filter((exercise): exercise is WorkoutExerciseInput => exercise !== null);

  if (exercises.length !== exercisesInput.length || exercises.length === 0) {
    return null;
  }

  return {
    clientId,
    routineId: parseOptionalString(body.routineId),
    startedAt: body.startedAt,
    completedAt,
    notes: parseOptionalString(body.notes),
    exercises,
  };
}

export async function registerWorkoutRoutes(app: FastifyInstance) {
  app.get('/workouts', async (request) => {
    return listWorkoutSessions(await resolveUserPublicId(request));
  });

  app.get<{ Params: { exerciseId: string } }>(
    '/workouts/exercises/:exerciseId/last',
    async (request, reply) => {
      const performance = await getExerciseLastPerformance(
        await resolveUserPublicId(request),
        request.params.exerciseId,
      );

      if (!performance) {
        return reply.code(404).send({ message: 'No previous performance' });
      }

      return performance;
    },
  );

  app.get<{ Params: { id: string } }>('/workouts/:id', async (request, reply) => {
    const session = await findWorkoutSessionById(
      await resolveUserPublicId(request),
      request.params.id,
    );

    if (!session) {
      return reply.code(404).send({ message: 'Workout session not found' });
    }

    return session;
  });

  app.post<{ Body: unknown }>('/workouts', async (request, reply) => {
    const parsedInput = parseCreateWorkoutSessionInput(request.body);

    if (!parsedInput) {
      return reply.code(400).send({ message: 'Invalid workout payload' });
    }

    const timesProblem = workoutTimesProblem(parsedInput);
    if (timesProblem) {
      return reply.code(400).send({ message: timesProblem });
    }

    const hasCompletedSet = parsedInput.exercises.some((exercise) =>
      exercise.sets.some((set) => Boolean(set.completedAt)),
    );

    if (!hasCompletedSet) {
      return reply.code(400).send({
        message: 'A workout must have at least one completed set',
      });
    }

    try {
      const { session, created } = await createWorkoutSession(
        await resolveUserPublicId(request),
        parsedInput,
      );

      // A repeated clientId answers with the workout saved first (spec 0014).
      return reply.code(created ? 201 : 200).send(session);
    } catch (error) {
      if (error instanceof UnknownExerciseError) {
        return reply.code(400).send({
          message: 'Workout references an unknown exercise',
        });
      }

      // Safety net: a reference deleted between the check and the create.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return reply.code(400).send({
          message: 'Workout references unknown exercise or routine',
        });
      }

      throw error;
    }
  });
}
