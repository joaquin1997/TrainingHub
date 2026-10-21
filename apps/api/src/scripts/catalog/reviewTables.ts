import type { CatalogEntry } from './vocabulary.js';

/** Spanish words for the review tables only; the app has its own (i18n). */
const MUSCLE_ES: Record<string, string> = {
  abs: 'abdomen',
  biceps: 'bíceps',
  brachialis: 'braquial',
  calves: 'gemelos',
  chest: 'pecho',
  glutes: 'glúteos',
  hamstrings: 'isquios',
  lats: 'dorsales',
  'obliquus externus abdominis': 'oblicuos',
  quads: 'cuádriceps',
  'serratus anterior': 'serrato',
  shoulders: 'hombros',
  soleus: 'sóleo',
  trapezius: 'trapecio',
  triceps: 'tríceps',
  forearms: 'antebrazos',
  'lower back': 'lumbar',
  adductors: 'aductores',
  abductors: 'abductores',
};

const EQUIPMENT_ES: Record<string, string> = {
  Barbell: 'barra',
  Dumbbell: 'mancuernas',
  Kettlebell: 'kettlebell',
  'SZ-Bar': 'barra Z',
  'Trap bar': 'barra hexagonal',
  Machine: 'máquina',
  'Smith machine': 'multipower',
  Cable: 'polea',
  'Pull-up bar': 'barra de dominadas',
  'Dip station': 'paralelas',
  Bench: 'banco',
  'Incline bench': 'banco inclinado',
  'none (bodyweight exercise)': 'peso corporal',
  'Resistance band': 'banda elástica',
  'Medicine ball': 'balón medicinal',
  'Swiss Ball': 'fitball',
  'Ab wheel': 'rueda abdominal',
  Landmine: 'landmine',
  Plate: 'disco',
  'Cardio machine': 'máquina de cardio',
  'Jump rope': 'comba',
};

const LOADING_ES: Record<string, string> = {
  barbell: 'barra',
  dumbbell: 'mancuernas',
  machine: 'máquina/polea',
};

const TRACKING_ES: Record<string, string> = {
  weight_reps: 'peso × reps',
  reps: 'reps',
  duration: 'tiempo',
  weight_duration: 'peso × tiempo',
  distance_duration: 'distancia y tiempo',
};

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const cell = (value: string) => value.replace(/\|/g, '\\|');
const list = (values: string[], words: Record<string, string>) =>
  values.map((value) => words[value] ?? value).join(', ');

/**
 * One markdown table per group for the owner's review (spec 0044 task 4):
 * one row per exercise, everything in Spanish, a picture link per row.
 */
export function reviewTable(title: string, entries: CatalogEntry[]): string {
  const rows = entries.map((entry, index) =>
    [
      String(index + 1),
      `**${cell(entry.es)}**<br>${cell(entry.en)}`,
      cell(entry.aliases.join(', ')),
      list(entry.primary, MUSCLE_ES),
      list(entry.secondary, MUSCLE_ES),
      list(entry.equipment, EQUIPMENT_ES),
      entry.loadingKind ? LOADING_ES[entry.loadingKind]! : '—',
      TRACKING_ES[entry.trackingType]!,
      entry.unilateral ? 'sí' : '',
      entry.image ? `[ver](${IMAGE_BASE}${entry.image}/0.jpg)` : '—',
    ].join(' | '),
  );

  return [
    `# ${title} (${entries.length})`,
    '',
    'Marca lo que esté mal en la columna que toque (nombre, músculos, equipo, carga, registro, unilateral o imagen).',
    '',
    '| # | Nombre | Otros nombres | Principal | Secundarios | Equipo | Carga | Registra | Unilateral | Imagen |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((row) => `| ${row} |`),
    '',
  ].join('\n');
}
