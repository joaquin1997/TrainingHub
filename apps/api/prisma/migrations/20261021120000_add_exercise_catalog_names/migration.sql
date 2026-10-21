-- Spec 0044: names per language, search names and loading kind of the reviewed catalog.
ALTER TABLE "Exercise" ADD COLUMN "nameEs" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Exercise" ADD COLUMN "loadingKind" TEXT;
