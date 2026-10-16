-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "trackingType" TEXT NOT NULL DEFAULT 'weight_reps';

-- AlterTable
ALTER TABLE "RoutineExerciseSet" ADD COLUMN     "targetDistanceMeters" DOUBLE PRECISION,
ADD COLUMN     "targetDurationSeconds" INTEGER;
