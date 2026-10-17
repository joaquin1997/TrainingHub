import type { ExerciseTrackingType } from '@workout/domain';

/**
 * Name rules of the tracking type sweep (spec 0030), in priority order: the
 * first rule with a keyword in any name of the movement (stored name and
 * every wger translation) and no `exclude` keyword in any of them decides.
 *
 * Keywords are matched on normalised text (lower case, no accents, `ß` ->
 * `ss`, punctuation -> space) as whole words. `*` at the end of a word matches
 * any ending (`plank*` -> planks), at the start any beginning (`*lauf` ->
 * dauerlauf), for plurals and German compounds.
 *
 * Languages: Spanish, English, German, Italian (the catalog's), with French
 * and Portuguese where wger uses them. To change a single exercise prefer an
 * owner correction (`data/tracking-type-corrections.json`) over a new rule.
 */
export type TrackingRule = {
  id: string;
  type: ExerciseTrackingType;
  /** False for the ambiguous moves the spec names: proposed, but to review. */
  certain: boolean;
  keywords: string[];
  exclude?: string[];
  /** The rule does not apply to a loaded movement (equipment or name). */
  notWhenLoaded?: boolean;
};

/** Words in a name that say the movement is held, not moved. */
const HOLD_WORDS = [
  'hold', 'holds', 'isometr*', 'static', 'estatic*', 'statisch*', 'halten', 'tenuta',
  'mantener', 'sostener', 'aguantar',
];

export const TRACKING_RULES: TrackingRule[] = [
  {
    // Spec assumption 2: bodyweight moves people commonly load keep weight &
    // reps, the weight read as added load and left empty when there is none.
    id: 'loadable-bodyweight',
    type: 'weight_reps',
    certain: true,
    keywords: [
      'pull up*', 'pullup*', 'chin up*', 'chinup*', 'dominada*', 'klimmzug*', 'trazion*',
      'dip', 'dips', 'fondos', 'fondo en paralela*', 'barrenstutz*',
      'lunge*', 'zancada*', 'estocada*', 'ausfallschritt*', 'affond*',
      'step up*', 'stepup*', 'subida* al banco', 'subida* al cajon',
      'hip thrust*', 'empuje* de cadera', 'back extension*', 'hyperextension*',
      'hiperextension*', 'ruckenstrecker*', 'iperestension*',
    ],
    exclude: [...HOLD_WORDS, 'hang', 'hanging', 'hip dip*'],
  },
  {
    // Carries and sleds: weight & time (0021; no weight & distance type).
    // Before `distance` so a farmer's walk is a carry, not a walk.
    id: 'carry',
    type: 'weight_duration',
    certain: true,
    keywords: [
      'carry', 'carries', 'farmer*', 'granjero', 'acarreo*', 'transporte*', 'bauernlauf',
      'suitcase carry*', 'suitcase walk*', 'waiter walk*', 'yoke', 'sled*', 'trineo*',
      'prowler', 'schlitten*', 'slitta', 'trasporto', 'camminata del contadino',
    ],
    // A sled leg press or a suitcase deadlift is a lift.
    exclude: ['press', 'deadlift*', 'peso muerto', 'prensa'],
  },
  {
    // Planks, isometric holds, L-sits, wall-sits, hangs.
    id: 'hold',
    type: 'duration',
    certain: true,
    keywords: [
      ...HOLD_WORDS,
      'plank*', 'plancha*', 'planche', 'planke*', 'unterarmstutz*', 'seitstutz*',
      'prancha', 'gainage',
      'l sit*', 'lsit*', 'wall sit*', 'wallsit*', 'sentadilla* en pared', 'sentadilla* contra la pared',
      'wandsitz*', 'sostenimiento*', 'mantenimiento*',
      'dead hang*', 'bar hang*', 'passive hang*', 'active hang*', 'hang', 'hangboard*',
      'fingerboard*', 'regleta*', 'suspension*', 'sospension*', 'colgad*',
    ],
    exclude: [
      // Dynamic variants of a plank are moved, not held.
      'jack*', 'row', 'rows', 'remo', 'push up*', 'pushup*', 'flexion*', 'up down*',
      'up and down*', 'walk*', 'tap*', 'toque*', 'climber*', 'escalador*', 'dip', 'dips',
      'reach*', 'rotation*', 'rotacion*', 'twist*', 'crunch*', 'jump*', 'salto*', 'to',
      // A hang that is a lift (hang clean, hanging leg raise), cycling, TRX.
      'clean', 'snatch', 'high pull', 'hanging', 'raise*', 'elevacion*', 'trx',
      'bike*', 'bici', 'bicicleta*', 'cycl*',
    ],
  },
  {
    id: 'stretch',
    type: 'duration',
    certain: true,
    keywords: [
      'stretch*', 'estiramiento*', 'estirar', 'dehnung*', '*dehnung', 'dehnen', 'allungament*',
      'etirement*', 'alongamento*', 'yoga',
    ],
  },
  {
    id: 'jump-rope',
    type: 'duration',
    certain: true,
    keywords: [
      'jump rope*', 'jumping rope*', 'skipping rope*', 'rope skipping', 'rope jump*',
      'saltar la cuerda', 'salto* a la comba', 'salto* de cuerda', 'salto* con cuerda',
      'comba', 'seilspring*', 'springseil*', 'salto della corda', 'corda per saltare',
      'skipping',
    ],
  },
  {
    // Spec assumption 3: ambiguous moves take the type most people log them
    // with, marked uncertain for the owner's review.
    id: 'ambiguous-timed',
    type: 'duration',
    certain: false,
    keywords: [
      'battle rope*', 'cuerda* de batalla', 'cuerda* ondulatoria*', 'kampfseil*',
      'stair*', 'escaladora', 'escalera*', 'step machine', 'stepper', 'treppensteig*',
    ],
  },
  {
    id: 'ambiguous-reps',
    type: 'reps',
    certain: false,
    keywords: ['mountain climber*', 'escalador*', 'bergsteiger*', 'scalator*', 'alpinista*'],
  },
  {
    // Running, walking, rowing machine, cycling, elliptical, swimming, ski machine.
    id: 'distance',
    type: 'distance_duration',
    certain: true,
    keywords: [
      'run', 'runs', 'running', 'runner*', 'jog*', 'correr', 'carrera*', 'trot*',
      'lauf*', '*lauf', 'laufen', 'joggen', 'corsa', 'correre', 'corrida',
      'walk', 'walking', 'caminar', 'caminata*', 'andar', 'marcha', 'gehen', 'spazier*',
      'camminata', 'camminare', 'caminhada',
      'treadmill', 'cinta de correr', 'cinta rodante', 'en cinta', 'laufband', 'tapis roulant',
      'rowing machine*', 'rowing ergometer', 'indoor row*', 'rower', 'remoergometro',
      'ergometro de remo', 'maquina de remo', 'remo indoor', 'ruderergometer', 'rudergerat',
      'vogatore', 'concept2', 'concept 2',
      'bike*', 'bicycle*', 'bicicleta*', 'bici', 'cycling', 'cycle', 'ciclismo', 'spinning',
      'fahrrad*', 'radfahr*', 'ergometer', 'cyclette', 'ciclette',
      'elliptic*', 'eliptic*', 'ellittic*', 'crosstrainer', 'cross trainer',
      'swim', 'swimming', 'natacion', 'nadar', 'schwimm*', 'nuoto', 'nuotare', 'natacao',
      'ski erg', 'skierg', 'ski machine', 'hiking', 'senderismo', 'wandern',
    ],
    exclude: [
      // Bicycle crunches and similar floor work.
      'crunch*', 'abdominal*', 'encogimiento*', 'twist*', 'sit up*',
      // Walking moves that are not a walk.
      'plank*', 'plancha*', 'walkout*', 'walk out*', 'inchworm*', 'bear', 'crab', 'duck',
      'spider*', 'monster', 'band*', 'lunge*', 'zancada*',
    ],
  },
  {
    id: 'sprint',
    type: 'distance_duration',
    certain: false,
    keywords: ['sprint*', 'esprint*'],
  },
  {
    // Spec assumption 2: bodyweight moves that are rarely loaded.
    id: 'bodyweight-reps',
    type: 'reps',
    certain: true,
    keywords: [
      'push up*', 'pushup*', 'press up*', 'flexiones', 'lagartija*', 'liegestutz*',
      'piegament*', 'flessioni', 'pompe*', 'flexao', 'flexoes',
      'burpee*',
      'sit up*', 'situp*', 'abdominales', 'crunch*', 'encogimiento* abdominal*', 'bauchpresse',
      'jumping jack*', 'salto* de tijera*', 'hampelmann*', 'star jump*',
      'air squat*', 'bodyweight squat*', 'sentadilla* sin peso', 'sentadilla* libre*',
      'sentadilla* al aire', 'sentadilla* con peso corporal',
      'leg raise*', 'leg lift*', 'elevacion* de pierna*', 'beinheben', 'knee raise*',
      'elevacion* de rodilla*', 'knieheben', 'toes to bar', 'v up*', 'flutter kick*',
      'box jump*', 'salto* al cajon', 'salto* al banco', 'jump*', 'salto*', 'saltar',
      '*sprung*', '*sprunge*', 'springen',
    ],
    // "Flexión de piernas / bíceps" is a curl, not a push-up.
    exclude: ['biceps', 'codo*', 'muneca*', 'femoral*', 'isquio*', 'curl*'],
    notWhenLoaded: true,
  },
];

/** Equipment that makes a movement a lift (wger names, normalised). */
export const LOAD_EQUIPMENT = [
  'barbell', 'dumbbell', 'kettlebell', 'sz bar', 'cable*', 'machine', 'plate*', 'smith',
  'medicine ball', 'landmine',
];

/** Words in a name that say the movement is loaded. */
export const LOAD_NAME_WORDS = [
  'cable*', 'polea*', 'maquina*', 'machine*', 'kabel*', 'cavo', 'cavi', 'weighted', 'lastre',
  'lastrad*', 'con peso', 'disco*', 'plate*', 'mancuerna*', 'dumbbell*', 'barbell*',
  'kettlebell*', 'pesa*', 'kurzhantel*', 'langhantel*', 'manubri*', 'bilanciere', 'smith',
  'balon medicinal', 'medicine ball', 'medizinball', 'landmine', 'zavorra', 'mit gewicht',
];
