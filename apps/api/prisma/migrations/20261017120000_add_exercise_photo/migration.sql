-- CreateTable
CREATE TABLE "ExercisePhoto" (
    "id" BIGSERIAL NOT NULL,
    "exerciseId" BIGINT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExercisePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExercisePhoto_exerciseId_key" ON "ExercisePhoto"("exerciseId");

-- AddForeignKey
ALTER TABLE "ExercisePhoto" ADD CONSTRAINT "ExercisePhoto_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
