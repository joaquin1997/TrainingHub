-- CreateTable
CREATE TABLE "ExerciseWarmUpPreference" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "exerciseId" BIGINT NOT NULL,
    "loadingKind" TEXT,
    "approachSetCount" INTEGER,
    "incrementKg" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseWarmUpPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseWarmUpPreference_userId_exerciseId_key" ON "ExerciseWarmUpPreference"("userId", "exerciseId");

-- AddForeignKey
ALTER TABLE "ExerciseWarmUpPreference" ADD CONSTRAINT "ExerciseWarmUpPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseWarmUpPreference" ADD CONSTRAINT "ExerciseWarmUpPreference_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
