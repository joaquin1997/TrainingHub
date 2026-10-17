import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  ExerciseLastPerformance,
  ExerciseTrackingType,
  WeightUnit,
  WorkoutSetType,
} from '@workout/domain';

import { useSetTimer } from '@/features/workouts/hooks/useSetTimer';
import {
  effectiveSetValue,
  sideRepsPlaceholder,
  type SetDraftField,
  type WorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';
import { formatDuration } from '@/lib/format';
import {
  formatDistance,
  parseDurationInput,
  trackingFields,
  type SetValueField,
} from '@/lib/tracking';
import { fromKg, roundWeight } from '@/lib/weight';
import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';

/**
 * A column of the row: a tracked field, or one side of the reps of a
 * unilateral exercise (spec 0022), side by side in the same row.
 */
type SetColumn = SetValueField | 'repsLeft' | 'repsRight';

function rowColumns(
  trackingType: ExerciseTrackingType | undefined,
  unilateral: boolean | undefined,
): readonly SetColumn[] {
  const fields = trackingFields(trackingType);
  return unilateral
    ? fields.flatMap((field): SetColumn[] => (field === 'reps' ? ['repsLeft', 'repsRight'] : [field]))
    : fields;
}

/** Draft field that holds each tracked value. */
const DRAFT_FIELD: Record<SetValueField, SetDraftField> = {
  weight: 'weightKg',
  reps: 'reps',
  duration: 'duration',
  distance: 'distance',
};

export function setTypeLabel(type: WorkoutSetType, t: TFunction) {
  switch (type) {
    case 'warmup':
      return t('workouts.setType.warmup');
    case 'drop':
      return t('workouts.setType.drop');
    case 'failure':
      return t('workouts.setType.failure');
    default:
      return t('workouts.setType.normal');
  }
}

/**
 * Compact "previous performance" for a set in the exercise's fields, e.g.
 * "60×8", "1:00" or "500m·1:45"; "–" when there is none.
 */
export function previousSetLabel(
  performance: ExerciseLastPerformance | null | undefined,
  order: number,
  trackingType: ExerciseTrackingType | undefined,
  unit: WeightUnit,
) {
  const last = performance?.sets.find((set) => set.order === order);
  if (!last) {
    return '–';
  }

  const fields = trackingFields(trackingType);
  const parts = fields.map((field) => {
    switch (field) {
      case 'weight':
        return last.weightKg != null ? String(roundWeight(fromKg(last.weightKg, unit))) : null;
      case 'reps':
        // Both sides of a unilateral set, e.g. "10/8" (spec 0022).
        if (last.repsLeft != null || last.repsRight != null) {
          return `${last.repsLeft ?? '–'}/${last.repsRight ?? '–'}`;
        }
        return last.reps != null ? String(last.reps) : null;
      case 'duration':
        return last.durationSeconds != null ? formatDuration(last.durationSeconds) : null;
      case 'distance':
        return last.distanceMeters != null
          ? formatDistance(last.distanceMeters).replace(' ', '')
          : null;
    }
  });

  if (parts.every((part) => part === null)) {
    return '–';
  }

  return parts.map((part) => part ?? '–').join(fields.includes('reps') ? '×' : '·');
}

/**
 * Two fields plus the timer do not fit the usual columns on a phone: the
 * previous column narrows, the time column widens and the figures shrink.
 */
function isCompact(fields: readonly SetColumn[]) {
  return (fields.length > 1 && fields.includes('duration')) || fields.length > 2;
}

function columnLabel(field: SetColumn, unit: WeightUnit, t: TFunction) {
  switch (field) {
    case 'repsLeft':
      return t('workouts.colLeft');
    case 'repsRight':
      return t('workouts.colRight');
    case 'weight':
      return unit.toUpperCase();
    case 'reps':
      return t('workouts.colReps');
    case 'duration':
      return t('workouts.colTime');
    case 'distance':
      return t('workouts.colDistance');
  }
}

type HeaderProps = {
  trackingType?: ExerciseTrackingType;
  /** Reps split into left and right columns (spec 0022). */
  unilateral?: boolean;
  unit: WeightUnit;
};

/** Column labels above an exercise's sets, for its tracking type (spec 0021 FR-3). */
export function WorkoutSetHeader({ trackingType, unilateral, unit }: HeaderProps) {
  const { t } = useTranslation();
  const fields = rowColumns(trackingType, unilateral);
  const compact = isCompact(fields);

  return (
    <View style={styles.headerRow}>
      <Text style={[styles.colSet, styles.colLabel]}>{t('workouts.colSet')}</Text>
      <Text
        numberOfLines={1}
        style={[styles.colPrev, compact ? styles.colPrevCompact : null, styles.colLabel]}
      >
        {t('workouts.colPrev')}
      </Text>
      {fields.map((field) => (
        <Text
          key={field}
          numberOfLines={1}
          style={[
            styles.colInput,
            field === 'duration' ? styles.colTimeLabel : null,
            field === 'duration' && compact ? styles.colTimeWide : null,
            styles.colLabel,
            styles.colCentered,
          ]}
        >
          {columnLabel(field, unit, t)}
        </Text>
      ))}
      <Ionicons name="checkmark" size={14} color={colors.textMuted} style={styles.colCheckIcon} />
      <View style={styles.colRemove} />
    </View>
  );
}

type RowProps = {
  set: WorkoutSetDraft;
  trackingType?: ExerciseTrackingType;
  /** Reps logged as left and right side by side (spec 0022 FR-2). */
  unilateral?: boolean;
  unit: WeightUnit;
  previousLabel: string;
  onChange: (field: SetDraftField, value: string) => void;
  onCycleType: () => void;
  onToggleDone: () => void;
  onRemove: () => void;
};

/**
 * One set of the active workout: type marker, previous, one input per
 * tracked field, done and remove. A time field carries the set timer
 * (FR-4) and is shown as m:ss once it loses focus (EF-2).
 */
export function WorkoutSetRow({
  set,
  trackingType,
  unilateral,
  unit,
  previousLabel,
  onChange,
  onCycleType,
  onToggleDone,
  onRemove,
}: RowProps) {
  const { t } = useTranslation();
  const timer = useSetTimer((seconds) => onChange('duration', formatDuration(seconds)));
  const typed = set.type === 'warmup' || set.type === 'drop';
  const fields = rowColumns(trackingType, unilateral);
  const compact = isCompact(fields);

  const startOrStopTimer = () => {
    if (timer.isRunning) {
      timer.stop();
      return;
    }
    const seconds = parseDurationInput(
      effectiveSetValue(set.duration ?? '', set.durationPlaceholder),
    );
    timer.start(typeof seconds === 'number' ? seconds : undefined);
  };

  const normaliseDuration = () => {
    const seconds = parseDurationInput(set.duration ?? '');
    if (typeof seconds === 'number' && formatDuration(seconds) !== set.duration) {
      onChange('duration', formatDuration(seconds));
    }
  };

  const renderInput = (field: SetColumn) => {
    const inputStyle = [
      styles.cellInput,
      compact ? styles.cellInputCompact : null,
      styles.colInput,
      set.done ? styles.cellInputDone : null,
    ];

    switch (field) {
      case 'weight':
        return (
          <TextInput
            key={field}
            keyboardType="decimal-pad"
            value={set.weightKg}
            placeholder={set.weightPlaceholder ?? '–'}
            placeholderTextColor={colors.textSubtle}
            onChangeText={(value) => onChange(DRAFT_FIELD[field], value)}
            style={inputStyle}
          />
        );
      case 'reps':
        return (
          <TextInput
            key={field}
            keyboardType="number-pad"
            value={set.reps}
            placeholder={set.repsPlaceholder ?? '–'}
            placeholderTextColor={colors.textSubtle}
            onChangeText={(value) => onChange(DRAFT_FIELD[field], value)}
            style={inputStyle}
          />
        );
      case 'repsLeft':
      case 'repsRight': {
        const side = field === 'repsLeft' ? 'left' : 'right';
        return (
          <TextInput
            key={field}
            keyboardType="number-pad"
            accessibilityLabel={t(side === 'left' ? 'workouts.repsLeft' : 'workouts.repsRight')}
            value={set[field] ?? ''}
            placeholder={sideRepsPlaceholder(set, side) ?? '–'}
            placeholderTextColor={colors.textSubtle}
            onChangeText={(value) => onChange(field, value)}
            style={inputStyle}
          />
        );
      }
      case 'distance':
        return (
          <TextInput
            key={field}
            keyboardType="decimal-pad"
            value={set.distance ?? ''}
            placeholder={set.distancePlaceholder ?? 'm'}
            placeholderTextColor={colors.textSubtle}
            onChangeText={(value) => onChange(DRAFT_FIELD[field], value)}
            style={inputStyle}
          />
        );
      case 'duration':
        return (
          <View
            key={field}
            style={[styles.colInput, compact ? styles.colTimeWide : null, styles.timeCell]}
          >
            <TextInput
              keyboardType="numbers-and-punctuation"
              editable={!timer.isRunning}
              value={timer.isRunning ? formatDuration(timer.displaySeconds) : (set.duration ?? '')}
              placeholder={set.durationPlaceholder ?? '–'}
              placeholderTextColor={colors.textSubtle}
              onChangeText={(value) => onChange(DRAFT_FIELD[field], value)}
              onBlur={normaliseDuration}
              style={[
                styles.cellInput,
                compact ? styles.cellInputCompact : null,
                styles.timeInput,
                set.done ? styles.cellInputDone : null,
                timer.isRunning ? styles.timeInputRunning : null,
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={timer.isRunning ? t('workouts.stopSetTimer') : t('workouts.startSetTimer')}
              onPress={startOrStopTimer}
              hitSlop={4}
              style={[styles.timerButton, timer.isRunning ? styles.timerButtonRunning : null]}
            >
              <Ionicons
                name={timer.isRunning ? 'stop' : 'play'}
                size={14}
                color={timer.isRunning ? colors.onPrimary : colors.textMuted}
              />
            </Pressable>
          </View>
        );
    }
  };

  return (
    <View style={[styles.row, set.done ? styles.rowDone : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          set.generatedWarmup
            ? t('workouts.generatedWarmupLabel', { type: setTypeLabel(set.type, t) })
            : setTypeLabel(set.type, t)
        }
        onPress={onCycleType}
        hitSlop={4}
        style={[
          styles.marker,
          set.type === 'failure' ? styles.markerFailure : null,
          typed ? styles.markerTyped : null,
          set.generatedWarmup ? styles.markerGenerated : null,
        ]}
      >
        <Text
          style={[
            styles.markerText,
            set.type === 'failure' ? styles.markerTextFailure : null,
            typed ? styles.markerTextTyped : null,
          ]}
        >
          {set.type === 'normal' ? set.order : setTypeLabel(set.type, t)[0]}
        </Text>
        {/* Added by the warm-up action, untouched since (spec 0031 FR-6). */}
        {set.generatedWarmup ? (
          <View style={styles.generatedBadge} pointerEvents="none">
            <Ionicons name="sparkles" size={9} color={colors.accent} />
          </View>
        ) : null}
      </Pressable>
      <Text
        numberOfLines={1}
        style={[styles.colPrev, compact ? styles.colPrevCompact : null, styles.prevText]}
      >
        {previousLabel}
      </Text>
      {fields.map(renderInput)}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done }}
        onPress={onToggleDone}
        hitSlop={4}
        style={[styles.checkBox, set.done ? styles.checkBoxDone : null]}
      >
        <Ionicons name="checkmark" size={20} color={set.done ? colors.onPrimary : colors.controlBorder} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.remove')}
        onPress={onRemove}
        hitSlop={6}
        style={styles.colRemove}
      >
        <Ionicons name="close" size={16} color={colors.textSubtle} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 4,
  },
  colLabel: {
    ...commonStyles.sectionLabel,
    fontSize: 10,
  },
  colCentered: {
    textAlign: 'center',
  },
  colSet: {
    width: 36,
  },
  colPrev: {
    width: 64,
  },
  colPrevCompact: {
    width: 48,
  },
  colInput: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  colTimeWide: {
    flex: 1.5,
  },
  // The time column also holds the timer button; centre its label on the input.
  colTimeLabel: {
    paddingRight: 32,
  },
  colCheckIcon: {
    width: 44,
    textAlign: 'center',
  },
  colRemove: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  rowDone: {
    backgroundColor: colors.successSoft,
  },
  marker: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  markerTyped: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  // A generated warm-up (spec 0031): dashed outline plus a badge, not colour alone.
  markerGenerated: {
    borderStyle: 'dashed',
    borderColor: colors.accent,
  },
  generatedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  markerFailure: {
    backgroundColor: colors.accentSoft,
  },
  markerText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  markerTextTyped: {
    color: colors.textMuted,
  },
  markerTextFailure: {
    color: colors.accent,
  },
  prevText: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  cellInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    textAlign: 'center',
    fontFamily: fonts.displayBold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    paddingVertical: 6,
  },
  cellInputCompact: {
    fontSize: 16,
    paddingHorizontal: 0,
  },
  cellInputDone: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  timeCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeInput: {
    flex: 1,
    minWidth: 0,
  },
  timeInputRunning: {
    color: colors.primary,
  },
  timerButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
  },
  timerButtonRunning: {
    backgroundColor: colors.primary,
  },
  checkBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    // An undone box must stand out from its fill at 3:1 (spec 0034 FR-16).
    borderColor: colors.controlBorder,
    backgroundColor: colors.surfaceRaised,
  },
  checkBoxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
});
