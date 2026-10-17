-- CreateTable
CREATE TABLE "RoutineWarmUpItem" (
    "id" BIGSERIAL NOT NULL,
    "routineId" BIGINT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "targetDurationSeconds" INTEGER,
    "targetReps" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineWarmUpItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutWarmUpItem" (
    "id" BIGSERIAL NOT NULL,
    "workoutSessionId" BIGINT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "targetDurationSeconds" INTEGER,
    "targetReps" INTEGER,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutWarmUpItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineWarmUpItem_routineId_orderIndex_idx" ON "RoutineWarmUpItem"("routineId", "orderIndex");

-- CreateIndex
CREATE INDEX "WorkoutWarmUpItem_workoutSessionId_order_idx" ON "WorkoutWarmUpItem"("workoutSessionId", "order");

-- AddForeignKey
ALTER TABLE "RoutineWarmUpItem" ADD CONSTRAINT "RoutineWarmUpItem_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutWarmUpItem" ADD CONSTRAINT "WorkoutWarmUpItem_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

