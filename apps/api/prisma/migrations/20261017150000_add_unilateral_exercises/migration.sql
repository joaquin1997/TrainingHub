-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "isUnilateral" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkoutSet" ADD COLUMN     "repsLeft" INTEGER,
ADD COLUMN     "repsRight" INTEGER;
