-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSession_userId_clientId_key" ON "WorkoutSession"("userId", "clientId");

