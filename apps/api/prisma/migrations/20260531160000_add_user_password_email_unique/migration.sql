-- Add password hash for email/password auth.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- Enforce unique email for login.
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
