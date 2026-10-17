import { describe, expect, it } from 'vitest';

import type { ExerciseTrackingType } from '@workout/domain';

import { classifyExercise, normalizeText, type ClassifierInput } from './classify.js';
import { CURATED_TRACKING_TYPES, curatedTypeBySourceId } from './curated.js';

const BODYWEIGHT = ['none (bodyweight exercise)'];

function exercise(
  names: string | string[],
  extra: Partial<ClassifierInput> = {},
): ClassifierInput {
  return { sourceId: 'x', names: Array.isArray(names) ? names : [names], ...extra };
}

function typeOf(names: string | string[], extra: Partial<ClassifierInput> = {}) {
  return classifyExercise(exercise(names, extra)).type;
}

describe('normalizeText', () => {
  it('drops case, accents and punctuation and expands ß', () => {
    expect(normalizeText('Elevación de piernas — colgado')).toBe('elevacion de piernas colgado');
    expect(normalizeText('Unterarmstütz')).toBe('unterarmstutz');
    expect(normalizeText('Fußgänger')).toBe('fussganger');
    expect(normalizeText("Farmer's carry")).toBe('farmer s carry');
  });
});

describe('classifyExercise — AC-2 by name, in every language', () => {
  const cases: Array<[ExerciseTrackingType, string | string[], Partial<ClassifierInput>?]> = [
    // Planks, holds and hangs are time.
    ['duration', 'Plancha'],
    ['duration', 'Plancha lateral'],
    ['duration', 'Front Plank'],
    ['duration', 'Unterarmstütz'],
    ['duration', 'Plank laterale'],
    ['duration', 'Hollow Hold'],
    ['duration', 'L-sit'],
    ['duration', 'Wall-sit'],
    ['duration', 'Sentadilla isometrica al fallo'],
    ['duration', 'Isometria trazioni impugnatura inversa'],
    ['duration', 'Pull-up Isometric Hold'],
    ['duration', 'Dead hang'],
    ['duration', 'Suspensiones en Regleta'],
    ['duration', 'Estiramiento de isquiotibiales'],
    ['duration', 'Wadendehnung'],
    ['duration', 'Saltar la cuerda: saltos básicos'],
    ['duration', 'Seilspringen'],
    // Running, walking, rowing, cycling, elliptical: distance & time.
    ['distance_duration', 'Run'],
    ['distance_duration', 'Jogging'],
    ['distance_duration', 'Carrera en Zona 2'],
    ['distance_duration', 'Correr en cinta'],
    ['distance_duration', 'Dauerlauf'],
    ['distance_duration', 'Walking'],
    ['distance_duration', 'Caminata'],
    ['distance_duration', 'Rowing Machine'],
    ['distance_duration', 'Remoergómetro'],
    ['distance_duration', 'Ciclismo'],
    ['distance_duration', 'Cardio en bicicleta estática'],
    ['distance_duration', 'Stationary Bike'],
    ['distance_duration', 'Cyclette'],
    ['distance_duration', 'La Elíptica'],
    ['distance_duration', 'Crosstrainer'],
    ['distance_duration', 'Natación'],
    // Carries and sleds: weight & time.
    ['weight_duration', "Dumbbell farmer's carry"],
    ['weight_duration', 'Paseo del granjero'],
    ['weight_duration', 'Suitcase Carry'],
    ['weight_duration', 'Empuje de trineo'],
    ['weight_duration', 'Bauernlauf'],
    // Bodyweight-only moves: reps only.
    ['reps', 'Flexiones', { equipment: BODYWEIGHT }],
    ['reps', 'Push-ups'],
    ['reps', 'Liegestütze'],
    ['reps', 'Piegamenti sulle braccia'],
    ['reps', 'Burpees'],
    ['reps', 'Sit-ups'],
    ['reps', 'Abdominales'],
    ['reps', 'Crunch'],
    ['reps', 'Jumping jacks'],
    ['reps', 'Saltos de tijera'],
    ['reps', 'Air squat'],
    ['reps', 'Elevación de piernas colgado', { equipment: ['Pull-up bar'] }],
    ['reps', 'Hanging leg raise'],
    ['reps', 'Box jump'],
    ['reps', 'Kastensprünge'],
    // Pull-ups, dips and other loadable bodyweight moves stay weight & reps.
    ['weight_reps', 'Dominadas'],
    ['weight_reps', 'Pull-ups'],
    ['weight_reps', 'Klimmzüge'],
    ['weight_reps', 'Trazioni alla sbarra'],
    ['weight_reps', 'Fondos en paralelas'],
    ['weight_reps', 'Dips'],
    ['weight_reps', 'Zancadas'],
    ['weight_reps', 'Walking lunges'],
    ['weight_reps', 'Hip thrust'],
    ['weight_reps', 'Hiperextensiones'],
    // Lifts with the same words are not swept away from weight & reps.
    ['weight_reps', 'Crunch en polea'],
    ['weight_reps', 'Cable crunch', { equipment: ['Cable'] }],
    ['weight_reps', 'Remo con barra', { equipment: ['Barbell'] }],
    ['weight_reps', 'Upright rowing', { equipment: ['Barbell'] }],
    ['weight_reps', 'Flexión de piernas tumbado', { equipment: ['Machine'] }],
    ['weight_reps', 'Flexiones de bíceps con mancuerna'],
    ['weight_reps', 'Hang clean', { equipment: ['Barbell'] }],
    ['weight_reps', 'Suitcase deadlift', { equipment: ['Dumbbell'] }],
    ['weight_reps', 'Sled leg press', { equipment: ['Machine'] }],
    ['weight_reps', 'Press banca', { equipment: ['Barbell', 'Bench'] }],
    ['weight_reps', 'Jump squat with barbell', { equipment: ['Barbell'] }],
  ];

  it.each(cases)('%s ← %s', (expected, names, extra) => {
    expect(typeOf(names, extra)).toBe(expected);
  });

  it('dynamic plank variants are not proposed as time', () => {
    expect(typeOf('Plank jacks')).not.toBe('duration');
    expect(typeOf('Plank to push-up')).not.toBe('duration');
    expect(typeOf('Plancha con toque de hombro')).not.toBe('duration');
    expect(typeOf('Renegade row (plank row)', { equipment: ['Dumbbell'] })).toBe('weight_reps');
  });

  it('bicycle crunches are reps, not a bike ride', () => {
    expect(typeOf('Bicycle crunch')).toBe('reps');
    expect(typeOf('Crunch bicicleta')).toBe('reps');
  });

  it('a farmer\'s walk is a carry, not a walk', () => {
    expect(typeOf("Farmer's walk")).toBe('weight_duration');
  });
});

describe('classifyExercise — every name of the movement', () => {
  it('classifies a Spanish-named exercise by its English translation', () => {
    const result = classifyExercise(
      exercise(['Ejercicio del oso', 'Bear plank hold'], { equipment: BODYWEIGHT }),
    );

    expect(result.type).toBe('duration');
    expect(result.reason).toContain('bear plank hold');
  });

  it('an exclusion in any language cancels the rule', () => {
    expect(typeOf(['Plancha dinámica', 'Plank jacks'])).not.toBe('duration');
  });
});

describe('classifyExercise — certainty and the default (FR-3)', () => {
  it('a loaded lift with no rule is weight & reps, certain', () => {
    expect(
      classifyExercise(exercise('Press militar', { equipment: ['Barbell'] })),
    ).toEqual({ type: 'weight_reps', reason: 'no rule: loaded lift', certain: true });
  });

  it('an undecidable bodyweight move is weight & reps, uncertain', () => {
    expect(
      classifyExercise(exercise('Superman', { equipment: BODYWEIGHT })),
    ).toEqual({ type: 'weight_reps', reason: 'no rule', certain: false });
  });

  it('a cardio exercise with no rule stays weight & reps, flagged for review', () => {
    const result = classifyExercise(exercise('High knees', { category: 'Cardio' }));

    expect(result).toEqual({
      type: 'weight_reps',
      reason: 'no rule (category cardio: review)',
      certain: false,
    });
  });

  it('ambiguous moves take the usual type, marked uncertain (spec assumption 3)', () => {
    expect(classifyExercise(exercise('Mountain climbers'))).toMatchObject({
      type: 'reps',
      certain: false,
    });
    expect(classifyExercise(exercise('Escaladores'))).toMatchObject({ type: 'reps', certain: false });
    expect(classifyExercise(exercise('Battle ropes'))).toMatchObject({
      type: 'duration',
      certain: false,
    });
    expect(classifyExercise(exercise('Stair climber'))).toMatchObject({
      type: 'duration',
      certain: false,
    });
  });

  it('rule calls say which rule and keyword decided', () => {
    expect(classifyExercise(exercise('Plancha')).reason).toBe('rule hold: "plancha*" in "plancha"');
  });
});

describe('classifyExercise — overrides (FR-4, FR-10, AC-8)', () => {
  const curated = curatedTypeBySourceId();

  it('the owner correction wins over the list and the rules', () => {
    const result = classifyExercise(
      { sourceId: '42', names: ['Burpees'] },
      { corrections: { '42': { type: 'duration', name: 'Burpees' } }, curated },
    );

    expect(result).toEqual({ type: 'duration', reason: 'owner correction', certain: true });
  });

  it('the 0021 list wins over the rules', () => {
    // 1548 "Stair Master" is time in the list; the rule would say uncertain time.
    expect(classifyExercise({ sourceId: '1548', names: ['Stair Master'] }, { curated })).toEqual({
      type: 'duration',
      reason: '0021 list',
      certain: true,
    });
  });

  it('keeps all 44 exercises of the 0021 list', () => {
    expect(curated.size).toBe(44);
    expect(curated.get('1307')).toBe('duration');
    expect(curated.get('1116')).toBe('weight_duration');
    expect(curated.get('1093')).toBe('distance_duration');
  });

  it('the rules alone agree with the 0021 list on its names', () => {
    const disagreements = Object.entries(CURATED_TRACKING_TYPES).flatMap(([type, entries]) =>
      Object.values(entries)
        .map((name) => ({ name, expected: type, got: typeOf(name) }))
        .filter((entry) => entry.got !== entry.expected),
    );

    // The list stays an override, but the rules would reach the same calls,
    // so new catalog imports of the same kind are classified alike (FR-11).
    expect(disagreements.map((entry) => entry.name)).toEqual([]);
  });
});
