-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultRestSeconds" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'kg';
