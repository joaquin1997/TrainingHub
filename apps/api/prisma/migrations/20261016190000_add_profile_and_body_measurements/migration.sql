-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "photo" BYTEA;

-- CreateTable
CREATE TABLE "BodyMeasurement" (
    "id" BIGSERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "musclePercent" DOUBLE PRECISION,
    "neckCm" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "hipsCm" DOUBLE PRECISION,
    "armCm" DOUBLE PRECISION,
    "forearmCm" DOUBLE PRECISION,
    "thighCm" DOUBLE PRECISION,
    "calfCm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BodyMeasurement_publicId_key" ON "BodyMeasurement"("publicId");

-- CreateIndex
CREATE INDEX "BodyMeasurement_userId_measuredAt_idx" ON "BodyMeasurement"("userId", "measuredAt");

-- AddForeignKey
ALTER TABLE "BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

