-- Spec 0038: the account's theme preference; null = follow the device.
ALTER TABLE "User" ADD COLUMN "appearance" TEXT;
