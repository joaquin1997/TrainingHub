import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { prisma } from '../infrastructure/prisma.js';
import { loadCatalog } from './catalog/catalog.js';
import { proposeCarryOver } from './catalog/carryOver.js';

/**
 * Lists every old exercise that a workout, a routine or a favourite uses —
 * and every custom exercise — with the reviewed exercise it most likely is
 * (spec 0044 task 5). **Read only.** Writes a markdown list for the owner
 * and a draft map { publicId: slug } of the exact and probable matches; the
 * owner's confirmed version is committed as data/catalog-carry-over.json.
 */
const LIST_PATH = process.env.CARRY_OVER_LIST ?? 'tmp/catalog-carry-over.md';
const DRAFT_PATH = process.env.CARRY_OVER_DRAFT ?? 'tmp/catalog-carry-over.draft.json';

async function main() {
  const used = await prisma.exercise.findMany({
    where: {
      source: { not: 'curated' },
      OR: [
        { workoutExercises: { some: {} } },
        { routineExercises: { some: {} } },
        { favorites: { some: {} } },
        { isSystemDefined: false, deletedAt: null },
      ],
    },
    select: {
      publicId: true,
      name: true,
      source: true,
      _count: { select: { workoutExercises: true, routineExercises: true, favorites: true } },
    },
    orderBy: { name: 'asc' },
  });

  const proposals = proposeCarryOver(
    used.map((exercise) => ({ id: exercise.publicId, name: exercise.name, source: exercise.source })),
    loadCatalog(),
  );
  const counts = new Map(used.map((exercise) => [exercise.publicId, exercise._count]));

  const rows = proposals.map((proposal) => {
    const count = counts.get(proposal.id)!;
    return `| ${proposal.name} | ${proposal.source === 'custom' ? 'propio' : 'catálogo'} | ${count.workoutExercises} | ${count.routineExercises} | ${count.favorites} | ${proposal.proposedName ?? '—'} | ${proposal.confidence} (${proposal.score}) | \`${proposal.id}\` |`;
  });
  const list = [
    '# Ejercicios antiguos en uso → catálogo revisado',
    '',
    'Confirma o corrige la columna "Pasa a". Sin propuesta = queda retirado con su nombre.',
    '',
    '| Ejercicio | Tipo | Entrenos | Rutinas | Favoritos | Pasa a | Confianza | Id |',
    '|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');

  const draft = Object.fromEntries(
    proposals.filter((proposal) => proposal.slug).map((proposal) => [proposal.id, proposal.slug]),
  );

  await mkdir(dirname(LIST_PATH), { recursive: true });
  await writeFile(LIST_PATH, list);
  await writeFile(DRAFT_PATH, `${JSON.stringify(draft, null, 2)}\n`);

  const by = (confidence: string) => proposals.filter((proposal) => proposal.confidence === confidence).length;
  console.log(
    `${proposals.length} in use: ${by('exact')} exact, ${by('probable')} probable, ${by('none')} none.\n` +
      `List: ${LIST_PATH}\nDraft map: ${DRAFT_PATH}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
