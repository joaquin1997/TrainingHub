-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "lastCorrectionMutationId" TEXT,
ADD COLUMN     "lastCorrectionPayloadHash" TEXT,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0;

