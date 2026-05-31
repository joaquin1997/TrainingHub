import type { FastifyInstance } from 'fastify';

import { registerAuthRoutes } from '../features/auth/routes.js';
import { registerExerciseRoutes } from '../features/exercises/routes.js';
import { registerProgressRoutes } from '../features/progress/routes.js';
import { registerRoutineRoutes } from '../features/routines/routes.js';
import { registerSettingsRoutes } from '../features/settings/routes.js';
import { registerWorkoutRoutes } from '../features/workouts/routes.js';
import { registerHealthRoutes } from './health.js';

export async function registerRoutes(app: FastifyInstance) {
  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerExerciseRoutes(app);
  await registerProgressRoutes(app);
  await registerRoutineRoutes(app);
  await registerSettingsRoutes(app);
  await registerWorkoutRoutes(app);

  // TODO: Register future feature modules from src/features/* here.
}
