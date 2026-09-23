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
