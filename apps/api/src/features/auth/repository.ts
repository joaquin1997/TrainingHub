import { randomUUID } from 'node:crypto';

import type { User } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';

type UserRecord = Awaited<ReturnType<typeof prisma.user.findUnique>>;

export function mapUser(record: NonNullable<UserRecord>): User {
  return {
    id: record.publicId,
    displayName: record.displayName,
    email: record.email ?? undefined,
    avatarUrl: record.avatarUrl ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function createEmailUser(input: {
  email: string;
  passwordHash: string;
  displayName: string;
}) {
  return prisma.user.create({
    data: {
      publicId: randomUUID(),
      displayName: input.displayName,
      email: input.email,
      passwordHash: input.passwordHash,
    },
  });
}

/** The account a sign-in identity belongs to (spec 0039). */
export async function findUserByIdentity(provider: string, subject: string) {
  const identity = await prisma.userIdentity.findUnique({
    where: { provider_subject: { provider, subject } },
    include: { user: true },
  });
  return identity?.user ?? null;
}

export function linkIdentity(input: {
  userId: bigint;
  provider: string;
  subject: string;
  email?: string;
}) {
  return prisma.userIdentity.create({
    data: {
      userId: input.userId,
      provider: input.provider,
      subject: input.subject,
      email: input.email ?? null,
    },
  });
}

/** An account with no password, reached through its identity (spec 0039 FR-6, FR-7). */
export function createUserWithIdentity(input: {
  email?: string;
  displayName: string;
  provider: string;
  subject: string;
}) {
  return prisma.user.create({
    data: {
      publicId: randomUUID(),
      displayName: input.displayName,
      email: input.email ?? null,
      identities: {
        create: { provider: input.provider, subject: input.subject, email: input.email ?? null },
      },
    },
  });
}

export function findUserById(id: bigint) {
  return prisma.user.findUnique({ where: { id } });
}
