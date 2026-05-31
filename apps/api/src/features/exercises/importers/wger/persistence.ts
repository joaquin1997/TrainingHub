import { prisma } from '../../../../infrastructure/prisma.js';
import { splitExerciseMuscleGroups } from '../../muscle-groups.js';

import type { ImportedExerciseRecord } from './types.js';

export async function upsertImportedExercises(
  exercises: ImportedExerciseRecord[],
) {
  for (const exercise of exercises) {
    const { primaryMuscleGroups, secondaryMuscleGroups } =
      splitExerciseMuscleGroups(
        exercise.primaryMuscles,
        exercise.secondaryMuscles,
      );

    await prisma.exercise.upsert({
      where: {
        source_sourceId: {
          source: exercise.source,
          sourceId: exercise.sourceId,
        },
      },
      create: {
        source: exercise.source,
        sourceId: exercise.sourceId,
        name: exercise.name,
        description: exercise.description,
        category: exercise.category,
        language: exercise.language,
        imageUrl: exercise.imageUrl,
        equipment: exercise.equipment,
        licenseAuthor: exercise.licenseAuthor,
        lastSourceUpdate: exercise.lastUpdate
          ? new Date(exercise.lastUpdate)
          : undefined,
        isSystemDefined: exercise.isSystemDefined,
        primaryMuscleGroupLinks: {
          create: primaryMuscleGroups.map((name) => ({
            muscleGroup: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          })),
        },
        secondaryMuscleGroupLinks: {
          create: secondaryMuscleGroups.map((name) => ({
            muscleGroup: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          })),
        },
      },
      update: {
        name: exercise.name,
        description: exercise.description,
        category: exercise.category,
        language: exercise.language,
        imageUrl: exercise.imageUrl,
        equipment: exercise.equipment,
        licenseAuthor: exercise.licenseAuthor,
        lastSourceUpdate: exercise.lastUpdate
          ? new Date(exercise.lastUpdate)
          : undefined,
        isSystemDefined: exercise.isSystemDefined,
        primaryMuscleGroupLinks: {
          deleteMany: {},
          create: primaryMuscleGroups.map((name) => ({
            muscleGroup: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          })),
        },
        secondaryMuscleGroupLinks: {
          deleteMany: {},
          create: secondaryMuscleGroups.map((name) => ({
            muscleGroup: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          })),
        },
      },
    });
  }
}
