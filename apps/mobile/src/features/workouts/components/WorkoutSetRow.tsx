import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  ExerciseLastPerformance,
  ExerciseTrackingType,
  LiveRecordHit,
  WeightUnit,
  WorkoutSetType,
} from '@workout/domain';

import { useSetTimer } from '@/features/workouts/hooks/useSetTimer';
import {
  recordBadgeAccessibilityLabel,
  recordBadgeLabel,
} from '@/features/workouts/liveRecords/recordBadgeLabel';
import {
  effectiveSetValue,
  sideRepsPlaceholder,
  type SetDraftField,
  type WorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';
import { setStatus, setStatusLabel } from '@/features/workouts/utils/setStatus';
import { formatDuration } from '@/lib/format';
import {
  formatDistance,
  parseDurationInput,
  trackingFields,
  type SetValueField,
} from '@/lib/tracking';
import { fromKg, roundWeight } from '@/lib/weight';
import { colors, commonStyles, createStyles, fonts, fontScaleCap, keyboardAppearance, radii, spacing, typeScale, useTheme } from '@/ui/theme';

import { SetStatusArea, STATUS_AREA_SIZE, useDoneTransition } from './SetStatusArea';

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

/** Sizes of the row's fixed parts (spec 0034 FR-19); hit areas reach 44 pt. */
const MARKER_SIZE = 32;
const REMOVE_WIDTH = 32;
const TIMER_SIZE = 32;
/** Row height of line 1: the status area's side. */
const LINE_HEIGHT = STATUS_AREA_SIZE;

/** Grows a control's touch area to 44 pt around a smaller visual. */
const MARKER_HIT = { top: 6, bottom: 6, left: 6, right: 6 };
/** Never reaches the status area: the row gap is 8 pt (plan-b, B1). */
const REMOVE_HIT = { top: 0, bottom: 0, left: 4, right: 8 };
const TIMER_HIT = 6;

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
 * "60 × 8", "1:00" or "500m · 1:45"; "–" when there is none.
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

  return parts.map((part) => part ?? '–').join(fields.includes('reps') ? ' × ' : ' · ');
}

/**
 * Two fields plus the timer, or three columns, leave narrower inputs: the
 * time column widens to hold its timer. Every value stays in Figure large
 * (spec 0034 FR-19); a value wider than its field scrolls inside it.
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
      return unit;
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

/**
 * Column labels above an exercise's sets, for its tracking type (spec 0021
 * FR-3): over the marker and each value column; nothing over the status area
 * and remove (spec 0034 — "last time" is on the row's second line).
 */
export function WorkoutSetHeader({ trackingType, unilateral, unit }: HeaderProps) {
  useTheme();
  const { t } = useTranslation();
  const fields = rowColumns(trackingType, unilateral);
  const compact = isCompact(fields);

  return (
    <View style={styles.headerRow}>
      <Text
        maxFontSizeMultiplier={fontScaleCap.fixedColumn}
        numberOfLines={1}
        style={[styles.colSet, styles.colLabel]}
      >
        {t('workouts.colSet')}
      </Text>
      <View style={styles.line}>
        <View style={[styles.inputs, compact ? styles.inputsCompact : null]}>
          {fields.map((field) => (
            <Text
              maxFontSizeMultiplier={fontScaleCap.fixedColumn}
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
        </View>
        <View style={styles.colStatus} />
        <View style={styles.colRemove} />
      </View>
    </View>
  );
}

type RowProps = {
  set: WorkoutSetDraft;
  /** The set's number among its exercise's working sets (spec 0040 FR-1). */
  setNumber: number;
  trackingType?: ExerciseTrackingType;
  /** Reps logged as left and right side by side (spec 0022 FR-2). */
  unilateral?: boolean;
  unit: WeightUnit;
  previousLabel: string;
  /** The set to do now (spec 0034 FR-20). */
  isUpNext?: boolean;
  /** Records this done set beat (spec 0032), if any. */
  recordHits?: LiveRecordHit[];
  /** The tick that just happened earned the record: it pops (FR-7). */
  recordPop?: boolean;
  onChange: (field: SetDraftField, value: string) => void;
  onCycleType: () => void;
  onToggleDone: () => void;
  onRemove: () => void;
};

/**
 * One set of the active workout (spec 0034 FR-19), on two lines:
 * 1. type marker (secondary) · one input per tracked field in Figure large ·
 *    the status area (the done target) · remove;
 * 2. "Last …" and, for a record, what it beat — muted, wrapping, omitted
 *    when there is nothing to say.
 * A time field carries the set timer (0021 FR-4) and is shown as m:ss once
 * it loses focus (EF-2).
 */
export function WorkoutSetRow({
  set,
  setNumber,
  trackingType,
  unilateral,
  unit,
  previousLabel,
  isUpNext = false,
  recordHits,
  recordPop = false,
  onChange,
  onCycleType,
  onToggleDone,
  onRemove,
}: RowProps) {
  useTheme();
  const { t } = useTranslation();
  const timer = useSetTimer((seconds) => onChange('duration', formatDuration(seconds)));
  const typed = set.type === 'warmup' || set.type === 'drop';
  const fields = rowColumns(trackingType, unilateral);
  const compact = isCompact(fields);
  const doneProgress = useDoneTransition(set.done);
  const hasRecord = Boolean(recordHits && recordHits.length > 0);
  const status = setStatus(set, { hasRecord, isUpNext });
  const recordText = hasRecord && set.done ? recordBadgeLabel(recordHits!, unit, t) : null;
  const lastText = previousLabel !== '–' ? t('workouts.setStatus.last', { value: previousLabel }) : null;
  const statusLabel =
    status === 'record'
      ? `${setStatusLabel(status, t)}: ${recordBadgeAccessibilityLabel(recordHits!, unit, t)}`
      : setStatusLabel(status, t);

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
      styles.colInput,
      set.done ? styles.cellInputDone : null,
    ];

    switch (field) {
      case 'weight':
        return (
          <TextInput maxFontSizeMultiplier={fontScaleCap.fixedColumn}
            keyboardAppearance={keyboardAppearance()}
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
          <TextInput maxFontSizeMultiplier={fontScaleCap.fixedColumn}
            keyboardAppearance={keyboardAppearance()}
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
          <TextInput maxFontSizeMultiplier={fontScaleCap.fixedColumn}
            keyboardAppearance={keyboardAppearance()}
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
          <TextInput maxFontSizeMultiplier={fontScaleCap.fixedColumn}
            keyboardAppearance={keyboardAppearance()}
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
            <TextInput maxFontSizeMultiplier={fontScaleCap.fixedColumn}
              keyboardAppearance={keyboardAppearance()}
              keyboardType="numbers-and-punctuation"
              editable={!timer.isRunning}
              value={timer.isRunning ? formatDuration(timer.displaySeconds) : (set.duration ?? '')}
              placeholder={set.durationPlaceholder ?? '–'}
              placeholderTextColor={colors.textSubtle}
              onChangeText={(value) => onChange(DRAFT_FIELD[field], value)}
              onBlur={normaliseDuration}
              style={[
                styles.cellInput,
                styles.timeInput,
                set.done ? styles.cellInputDone : null,
                timer.isRunning ? styles.timeInputRunning : null,
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={timer.isRunning ? t('workouts.stopSetTimer') : t('workouts.startSetTimer')}
              onPress={startOrStopTimer}
              hitSlop={TIMER_HIT}
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
    <View style={styles.row}>
      {/* The done tint fades in and out (spec 0034 FR-6). */}
      <Animated.View pointerEvents="none" style={[styles.doneTint, { opacity: doneProgress }]} />
      <View style={styles.markerSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            set.generatedWarmup
              ? t('workouts.generatedWarmupLabel', { type: setTypeLabel(set.type, t) })
              : setTypeLabel(set.type, t)
          }
          onPress={onCycleType}
          hitSlop={MARKER_HIT}
          style={[
            styles.marker,
            set.type === 'failure' ? styles.markerFailure : null,
            typed ? styles.markerTyped : null,
          ]}
        >
          <Text maxFontSizeMultiplier={fontScaleCap.fixedColumn}
            style={[
              styles.markerText,
              set.type === 'failure' ? styles.markerTextFailure : null,
            ]}
          >
            {set.type === 'normal' ? setNumber : setTypeLabel(set.type, t)[0]}
          </Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <View style={[styles.inputs, compact ? styles.inputsCompact : null]}>
            {fields.map(renderInput)}
          </View>
          <SetStatusArea
            status={status}
            pop={recordPop}
            accessibilityLabel={statusLabel}
            onPress={onToggleDone}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.remove')}
            onPress={onRemove}
            hitSlop={REMOVE_HIT}
            style={styles.colRemove}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
        {lastText || recordText ? (
          <Text style={styles.secondLine}>
            {lastText}
            {lastText && recordText ? ' · ' : null}
            {recordText ? <Text style={styles.recordText}>{recordText}</Text> : null}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = createStyles(() => ({
  // Lined up with the rows below: same padding, same (invisible) border.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.xs,
  },
  colLabel: {
    ...commonStyles.columnLabel,
  },
  colCentered: {
    textAlign: 'center',
  },
  colSet: {
    width: MARKER_SIZE,
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
    paddingRight: spacing.xxxl,
  },
  colStatus: {
    width: STATUS_AREA_SIZE,
  },
  colRemove: {
    width: REMOVE_WIDTH,
    height: LINE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  doneTint: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.md,
    backgroundColor: colors.successSoft,
  },
  markerSlot: {
    height: LINE_HEIGHT,
    justifyContent: 'center',
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  markerTyped: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  markerFailure: {
    backgroundColor: colors.accentSoft,
  },
  // The set number is secondary to the values (FR-19).
  markerText: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
    fontVariant: ['tabular-nums'],
  },
  markerTextFailure: {
    color: colors.accentInk,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  line: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputs: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Each input has its own edge; a narrower gap leaves the figures more room.
  inputsCompact: {
    gap: spacing.xs,
  },
  secondLine: {
    color: colors.textMuted,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
  recordText: {
    color: colors.accentInk,
    fontWeight: '700',
  },
  cellInput: {
    minHeight: LINE_HEIGHT,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    textAlign: 'center',
    // Figure large; inputs take no line height (iOS would clip the glyphs).
    fontFamily: fonts.displayBold,
    fontSize: typeScale.figureLarge.fontSize,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  cellInputDone: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  timeCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeInput: {
    flex: 1,
    minWidth: 0,
  },
  timeInputRunning: {
    color: colors.primaryInk,
  },
  timerButton: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.surfaceRaised,
  },
  timerButtonRunning: {
    backgroundColor: colors.primary,
  },
}));
