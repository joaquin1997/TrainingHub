-- Optional: create a local development user
CREATE USER dev WITH PASSWORD 'dev';

-- Optional: create the database
CREATE DATABASE workout_tracker OWNER dev;

-- Connect to the database before running the rest
-- \c workout_tracker

CREATE TABLE workout_tracker."User" (
  id TEXT PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  email TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workout_tracker."Routine" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Routine_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES workout_tracker."User"(id)
    ON DELETE CASCADE
);

CREATE TABLE workout_tracker."RoutineExercise" (
  id TEXT PRIMARY KEY,
  "routineId" TEXT NOT NULL,
  "exerciseName" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "RoutineExercise_routineId_fkey"
    FOREIGN KEY ("routineId")
    REFERENCES workout_tracker."Routine"(id)
    ON DELETE CASCADE
);

CREATE INDEX "Routine_userId_createdAt_idx"
  ON workout_tracker."Routine" ("userId", "createdAt");

CREATE INDEX "RoutineExercise_routineId_order_idx"
  ON workout_tracker."RoutineExercise" ("routineId", "orderIndex");

CREATE TABLE workout_tracker."RoutineExerciseSet" (
  id TEXT PRIMARY KEY,
  "routineExerciseId" TEXT NOT NULL,
  "setNumber" INTEGER NOT NULL,
  "minReps" INTEGER,
  "maxReps" INTEGER,
  "targetWeight" DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "RoutineExerciseSet_routineExerciseId_fkey"
    FOREIGN KEY ("routineExerciseId")
    REFERENCES "RoutineExercise"(id)
    ON DELETE CASCADE
);

CREATE INDEX "RoutineExerciseSet_routineExerciseId_setNumber_idx"
  ON workout_tracker."RoutineExerciseSet" ("routineExerciseId", "setNumber");

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dev;