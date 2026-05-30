-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" BIGSERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "routineId" BIGINT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" BIGSERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "workoutSessionId" BIGINT NOT NULL,
    "exerciseId" BIGINT NOT NULL,
    "routineExerciseId" BIGINT,
    "order" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" BIGSERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "workoutExerciseId" BIGINT NOT NULL,
    "order" INTEGER NOT NULL,
    "reps" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "durationSeconds" INTEGER,
    "distanceMeters" DOUBLE PRECISION,
    "isWarmup" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSession_publicId_key" ON "WorkoutSession"("publicId");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutExercise_publicId_key" ON "WorkoutExercise"("publicId");

-- CreateIndex
CREATE INDEX "WorkoutExercise_workoutSessionId_order_idx" ON "WorkoutExercise"("workoutSessionId", "order");

-- CreateIndex
CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSet_publicId_key" ON "WorkoutSet"("publicId");

-- CreateIndex
CREATE INDEX "WorkoutSet_workoutExerciseId_order_idx" ON "WorkoutSet"("workoutExerciseId", "order");

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_routineExerciseId_fkey" FOREIGN KEY ("routineExerciseId") REFERENCES "RoutineExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
