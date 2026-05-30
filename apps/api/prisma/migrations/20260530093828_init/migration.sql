-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" BIGSERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "language" TEXT,
    "equipment" TEXT[],
    "licenseAuthor" TEXT,
    "lastSourceUpdate" TIMESTAMP(3),
    "isSystemDefined" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MuscleGroup" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MuscleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExercisePrimaryMuscleGroup" (
    "exerciseId" BIGINT NOT NULL,
    "muscleGroupId" BIGINT NOT NULL,

    CONSTRAINT "ExercisePrimaryMuscleGroup_pkey" PRIMARY KEY ("exerciseId","muscleGroupId")
);

-- CreateTable
CREATE TABLE "ExerciseSecondaryMuscleGroup" (
    "exerciseId" BIGINT NOT NULL,
    "muscleGroupId" BIGINT NOT NULL,

    CONSTRAINT "ExerciseSecondaryMuscleGroup_pkey" PRIMARY KEY ("exerciseId","muscleGroupId")
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" BIGSERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineExercise" (
    "id" BIGSERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "routineId" BIGINT NOT NULL,
    "exerciseId" BIGINT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineExerciseSet" (
    "id" BIGSERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "routineExerciseId" BIGINT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "minReps" INTEGER,
    "maxReps" INTEGER,
    "targetWeight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineExerciseSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_publicId_key" ON "Exercise"("publicId");

-- CreateIndex
CREATE INDEX "Exercise_name_idx" ON "Exercise"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_source_sourceId_key" ON "Exercise"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "MuscleGroup_name_key" ON "MuscleGroup"("name");

-- CreateIndex
CREATE INDEX "ExercisePrimaryMuscleGroup_muscleGroupId_idx" ON "ExercisePrimaryMuscleGroup"("muscleGroupId");

-- CreateIndex
CREATE INDEX "ExerciseSecondaryMuscleGroup_muscleGroupId_idx" ON "ExerciseSecondaryMuscleGroup"("muscleGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Routine_publicId_key" ON "Routine"("publicId");

-- CreateIndex
CREATE INDEX "Routine_userId_createdAt_idx" ON "Routine"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineExercise_publicId_key" ON "RoutineExercise"("publicId");

-- CreateIndex
CREATE INDEX "RoutineExercise_exerciseId_idx" ON "RoutineExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "RoutineExercise_routineId_orderIndex_idx" ON "RoutineExercise"("routineId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineExerciseSet_publicId_key" ON "RoutineExerciseSet"("publicId");

-- CreateIndex
CREATE INDEX "RoutineExerciseSet_routineExerciseId_setNumber_idx" ON "RoutineExerciseSet"("routineExerciseId", "setNumber");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExercisePrimaryMuscleGroup" ADD CONSTRAINT "ExercisePrimaryMuscleGroup_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExercisePrimaryMuscleGroup" ADD CONSTRAINT "ExercisePrimaryMuscleGroup_muscleGroupId_fkey" FOREIGN KEY ("muscleGroupId") REFERENCES "MuscleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSecondaryMuscleGroup" ADD CONSTRAINT "ExerciseSecondaryMuscleGroup_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSecondaryMuscleGroup" ADD CONSTRAINT "ExerciseSecondaryMuscleGroup_muscleGroupId_fkey" FOREIGN KEY ("muscleGroupId") REFERENCES "MuscleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExerciseSet" ADD CONSTRAINT "RoutineExerciseSet_routineExerciseId_fkey" FOREIGN KEY ("routineExerciseId") REFERENCES "RoutineExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
