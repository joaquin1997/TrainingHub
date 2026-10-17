import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { ExerciseTrackingType, WeightUnit } from '@workout/domain';

import { routineSetLabel } from '@/features/routines/utils/routineApproachSets';
import {
  setFieldPlaceholder,
  type NumericSetField,
} from '@/features/routines/utils/routineSetInheritance';
import { formatDuration } from '@/lib/format';
import { parseDurationInput, trackingFields, type SetValueField } from '@/lib/tracking';
import { colors, commonStyles, createStyles, fonts, spacing, typeScale, useTheme } from '@/ui/theme';

/** One target set as typed in the routine editor (weight in the display unit). */
export type EditableRoutineSet = {
  id: string;
  minReps: string;
  maxReps: string;
  targetWeight: string;
  /** Seconds or m:ss (spec 0021). */
  targetDuration: string;
  /** Metres (spec 0021). */
  targetDistance: string;
  /** A warm-up (approach) set (spec 0024). */
  isWarmup?: boolean;
  /** Added by the warm-up action and untouched since (spec 0031). */
  generatedWarmup?: boolean;
};

/** The editor columns of each tracked field: reps has a min and a max. */
const COLUMNS: Record<SetValueField, NumericSetField[]> = {
  weight: ['targetWeight'],
  reps: ['minReps', 'maxReps'],
  duration: ['targetDuration'],
  distance: ['targetDistance'],
};

/** The routine-set fields an exercise of this tracking type edits (FR-3). */
export function routineSetColumns(trackingType?: ExerciseTrackingType): NumericSetField[] {
  return trackingFields(trackingType).flatMap((field) => COLUMNS[field]);
}

type Props = {
  sets: EditableRoutineSet[];
  trackingType?: ExerciseTrackingType;
  unit: WeightUnit;
  onChange: (setId: string, field: NumericSetField, value: string) => void;
  onRemove: (setId: string) => void;
};

/** The target sets of one routine exercise, with the columns of its type. */
export function RoutineSetTable({ sets, trackingType, unit, onChange, onRemove }: Props) {
  useTheme();
  const { t } = useTranslation();
  const columns = routineSetColumns(trackingType);

  const label = (field: NumericSetField) => {
    switch (field) {
      case 'targetWeight':
        return unit;
      case 'minReps':
        return t('routineForm.colMin');
      case 'maxReps':
        return t('routineForm.colMax');
      case 'targetDuration':
        return t('workouts.colTime');
      case 'targetDistance':
        return t('workouts.colDistance');
    }
  };

  const keyboard = (field: NumericSetField) =>
    field === 'targetDuration'
      ? 'numbers-and-punctuation'
      : field === 'targetWeight' || field === 'targetDistance'
        ? 'decimal-pad'
        : 'number-pad';

  // A typed time reads as m:ss once the field is left (EF-2).
  const normaliseDuration = (set: EditableRoutineSet) => {
    const seconds = parseDurationInput(set.targetDuration);
    if (typeof seconds === 'number' && formatDuration(seconds) !== set.targetDuration) {
      onChange(set.id, 'targetDuration', formatDuration(seconds));
    }
  };

  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Text style={[styles.colSet, styles.colLabel]}>{t('workouts.colSet')}</Text>
        {columns.map((field) => (
          <Text key={field} style={[styles.colField, styles.colLabel]}>
            {label(field)}
          </Text>
        ))}
        <View style={styles.colRemove} />
      </View>
      {sets.map((set, setIndex) => (
        <View key={set.id} style={styles.row}>
          {set.isWarmup && set.generatedWarmup ? (
            // A generated warm-up row: the letter plus a badge (spec 0031 FR-6).
            <View
              accessible
              accessibilityLabel={t('workouts.generatedWarmupLabel', {
                type: t('workouts.setType.warmup'),
              })}
              style={[styles.colSet, styles.generatedCell]}
            >
              <Text style={styles.setNumber}>
                {routineSetLabel(sets, setIndex, t('workouts.setType.warmup'))}
              </Text>
              <Ionicons name="sparkles" size={10} color={colors.accentInk} />
            </View>
          ) : (
            <Text style={[styles.colSet, styles.setNumber]}>
              {routineSetLabel(sets, setIndex, t('workouts.setType.warmup'))}
            </Text>
          )}
          {columns.map((field) => (
            <TextInput
              keyboardAppearance="dark"
              key={field}
              value={set[field]}
              onChangeText={(value) => onChange(set.id, field, value)}
              onBlur={field === 'targetDuration' ? () => normaliseDuration(set) : undefined}
              placeholder={setFieldPlaceholder(sets, setIndex, field)}
              placeholderTextColor={colors.textSubtle}
              keyboardType={keyboard(field)}
              style={[styles.input, styles.colField]}
            />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('routineForm.removeSet')}
            onPress={() => onRemove(set.id)}
            hitSlop={6}
            style={styles.colRemove}
          >
            <Ionicons name="close" size={18} color={colors.textSubtle} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = createStyles(() => ({
  table: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colLabel: {
    ...commonStyles.columnLabel,
    textAlign: 'center',
  },
  colSet: {
    width: 40,
  },
  colField: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  colRemove: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatedCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  setNumber: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  input: {
    ...commonStyles.input,
    minHeight: 46,
    paddingHorizontal: spacing.xs,
    textAlign: 'center',
    fontFamily: fonts.displayBold,
    fontSize: typeScale.figure.fontSize,
    fontVariant: ['tabular-nums'],
  },
}));
