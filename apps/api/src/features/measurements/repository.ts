import type { BodyMeasurementEntry } from '@workout/domain';

import { prisma } from '../../infrastructure/prisma.js';
import { BODY_MEASUREMENT_KEYS, type MeasurementWrite } from './validation.js';

type MeasurementRow = MeasurementWrite & {
  publicId: string;
  createdAt: Date;
  updatedAt: Date;
};

function mapEntry(row: MeasurementRow): BodyMeasurementEntry {
  const entry: BodyMeasurementEntry = {
    id: row.publicId,
    measuredAt: row.measuredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  for (const key of BODY_MEASUREMENT_KEYS) {
    entry[key] = row[key];
  }
  return entry;
}

/** Every entry of the user, newest first (same-day entries by time, EF-3). */
export async function listMeasurements(userPublicId: string): Promise<BodyMeasurementEntry[]> {
  const rows = await prisma.bodyMeasurement.findMany({
    where: { user: { publicId: userPublicId } },
    orderBy: [{ measuredAt: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map(mapEntry);
}

export async function createMeasurement(
  userPublicId: string,
  input: MeasurementWrite,
): Promise<BodyMeasurementEntry> {
  const row = await prisma.bodyMeasurement.create({
    data: { ...input, user: { connect: { publicId: userPublicId } } },
  });
  return mapEntry(row);
}

/** Full replace of one of the user's entries; `null` when it is not theirs. */
export async function updateMeasurement(
  userPublicId: string,
  entryId: string,
  input: MeasurementWrite,
): Promise<BodyMeasurementEntry | null> {
  const { count } = await prisma.bodyMeasurement.updateMany({
    where: { publicId: entryId, user: { publicId: userPublicId } },
    data: input,
  });
  if (count === 0) {
    return null;
  }
  const row = await prisma.bodyMeasurement.findUnique({ where: { publicId: entryId } });
  return row ? mapEntry(row) : null;
}

/** Deletes one of the user's entries; `false` when it is not theirs. */
export async function deleteMeasurement(userPublicId: string, entryId: string): Promise<boolean> {
  const { count } = await prisma.bodyMeasurement.deleteMany({
    where: { publicId: entryId, user: { publicId: userPublicId } },
  });
  return count > 0;
}
