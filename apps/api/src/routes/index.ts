import type { FastifyInstance } from 'fastify';

import { registerWarmUpPreferencesRoutes } from '../features/exercises/warmUpPreferencesRoutes.js';
import { registerAuthRoutes } from '../features/auth/routes.js';
import { registerExerciseRoutes } from '../features/exercises/routes.js';
import { registerExerciseTrackingTypeRoutes } from '../features/exercises/trackingTypeRoutes.js';
import { registerMeasurementRoutes } from '../features/measurements/routes.js';
import { registerProfileRoutes } from '../features/profile/routes.js';
import { registerProgressRoutes } from '../features/progress/routes.js';
import { registerRoutineRoutes } from '../features/routines/routes.js';
import { registerSettingsRoutes } from '../features/settings/routes.js';
import { registerWorkoutRoutes } from '../features/workouts/routes.js';
import { registerHealthRoutes } from './health.js';

export async function registerRoutes(app: FastifyInstance) {
  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerExerciseRoutes(app);
  await registerExerciseTrackingTypeRoutes(app);
  await registerWarmUpPreferencesRoutes(app);
  await registerMeasurementRoutes(app);
  await registerProfileRoutes(app);
  await registerProgressRoutes(app);
  await registerRoutineRoutes(app);
  await registerSettingsRoutes(app);
  await registerWorkoutRoutes(app);

  // TODO: Register future feature modules from src/features/* here.
}
