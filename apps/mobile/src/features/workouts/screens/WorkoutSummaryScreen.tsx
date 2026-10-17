import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { progressClient } from '@/features/progress/api/progressClient';
import { RecordsCard } from '@/features/progress/components/RecordsCard';
import { RecordCelebration } from '@/features/workouts/components/RecordCelebration';
import {
  clearLatestCompletedWorkout,
  getLatestCompletedWorkout,
  toWorkoutSessionSkeleton,
} from '@/features/workouts/state/workoutDraftStore';
import { ShareSheet } from '@/features/workouts/components/ShareSheet';
import { useWorkoutComparison } from '@/features/workouts/hooks/useWorkoutComparison';
import { buildShareCard } from '@/features/workouts/utils/shareCard';
import {
  formatWorkoutShareText,
  shareRecords,
  type ShareWorkoutInput,
} from '@/features/workouts/utils/shareText';
import { shareWorkoutText } from '@/features/workouts/utils/shareWorkout';
import { summarizeSession } from '@/features/workouts/utils/sessionStats';
import {
  describeComparison,
  type ComparedWorkout,
  type VolumeComparison,
} from '@/features/workouts/utils/workoutComparison';
import { activeDurationSeconds, formatDuration } from '@/lib/format';
import { formatDistance, formatSetValues, sideLabels } from '@/lib/tracking';
import { formatWeightValue } from '@/lib/weight';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StatTile } from '@/ui/StatTile';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';
import { CardHeader } from '@/ui/CardHeader';
import type { SessionRecord, WeightUnit, WorkoutSetType } from '@workout/domain';

function setTypeLabel(type: WorkoutSetType, t: TFunction) {
  switch (type) {
    case 'warmup':
      return t('workouts.setType.warmup');
    case 'drop':
      return t('workouts.setType.drop');
    case 'failure':
      return t('workouts.setType.failure');
    default:
      return null;
  }
}

const comparisonIcon = {
  up: 'arrow-up',
  down: 'arrow-down',
  same: 'remove',
} as const;

/**
 * An exercise's volume against its last session (FR-24): arrow + words, so the
 * direction is never told by colour alone (FR-17). Green only for an increase;
 * less volume is not an error.
 */
function ComparisonChip({
  comparison,
  unit,
  language,
  t,
}: {
  comparison: VolumeComparison;
  unit: WeightUnit;
  language: string;
  t: TFunction;
}) {
  useTheme();
  const words = describeComparison(comparison, unit, language, t);
  return (
    <View accessible accessibilityLabel={words.sentence}>
      <Chip
        size="sm"
        icon={comparisonIcon[comparison.direction]}
        tone={comparison.direction === 'up' ? 'done' : 'neutral'}
        label={words.short}
      />
    </View>
  );
}

export function WorkoutSummaryScreen() {
  useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const workoutDraft = getLatestCompletedWorkout();
  const clientId = workoutDraft?.clientId;
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // The records this workout beat (spec 0023). The workout is already saved
  // when the summary shows; any failure just leaves the card out.
  useEffect(() => {
    if (!clientId) {
      return;
    }

    let isActive = true;

    progressClient
      .sessionRecords()
      .then((sessions) => {
        const match = sessions.find((session) => session.clientId === clientId);
        if (isActive && match) {
          setRecords(match.records);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [clientId]);

  // Volume versus last time (FR-24): the workout as saved, compared with the
  // history once; nothing is shown until (and unless) it loads (EF-5).
  const unit = workoutDraft?.unit ?? 'kg';
  const workoutSession = workoutDraft ? toWorkoutSessionSkeleton(workoutDraft) : null;
  const isDone = (exerciseIndex: number, setIndex: number) =>
    workoutDraft?.exercises[exerciseIndex]?.entries[setIndex]?.done ?? false;
  const compared: ComparedWorkout | null = workoutSession
    ? {
        routineId: workoutSession.routineId,
        startedAt: workoutSession.startedAt,
        exercises: workoutSession.exercises.map((exercise, exerciseIndex) => ({
          exerciseId: exercise.exerciseId,
          sets: exercise.sets.map((set, setIndex) => ({
            ...set,
            performed: isDone(exerciseIndex, setIndex),
          })),
        })),
      }
    : null;
  const comparison = useWorkoutComparison(compared, unit);

  const leaveTo = (path: Parameters<typeof router.replace>[0]) => {
    clearLatestCompletedWorkout();
    router.replace(path);
  };

  if (!workoutDraft || !workoutSession || !compared) {
    return (
      <View style={styles.screen}>
        <StateView
          kind="empty"
          icon="checkmark-done-outline"
          message={t('workouts.noCompleted')}
          actionLabel={t('routineDetail.backToRoutines')}
          onAction={() => router.replace('/routines')}
        />
      </View>
    );
  }

  // Rendered from the skeleton so the summary shows what was saved, ghosted
  // placeholders included, formatted back into the session unit (spec 0013).
  // The skeleton stamps every set; "done" comes from the draft.
  const stats = summarizeSession(compared);
  const duration = activeDurationSeconds(
    workoutSession.startedAt,
    workoutSession.completedAt,
    workoutSession.pausedSeconds,
  );
  // One input for both share formats: the 0028 text and the image card (FR-25).
  const shareInput: ShareWorkoutInput = {
    title: workoutDraft.routineName,
    when: workoutSession.completedAt ?? workoutSession.startedAt,
    durationSeconds: duration,
    volumeKg: stats.volumeKg,
    unit,
    language: i18n.language,
    exercises: workoutSession.exercises.map((exercise, exerciseIndex) => ({
      name: exercise.exerciseName,
      sets: exercise.sets.map((set, setIndex) => ({
        ...set,
        performed: isDone(exerciseIndex, setIndex),
      })),
    })),
    notes: workoutSession.notes,
    records: shareRecords(records, unit, t),
    t,
  };
  const routineComparison = comparison?.routine
    ? describeComparison(comparison.routine, unit, i18n.language, t)
    : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="trophy" size={28} color={colors.onPrimary} />
        </View>
        <Text style={styles.heroTitle}>{workoutDraft.routineName}</Text>
        <Chip icon="checkmark-circle" tone="done" label={t('workouts.savedToHistory')} />
      </View>
      {/* Records of the day lead (FR-24); the block appears when they arrive. */}
      {records.length > 0 ? (
        <RecordCelebration workoutId={clientId} recordCount={records.length}>
          <RecordsCard
            title={t('progress.records.today')}
            unit={unit}
            variant="highlight"
            items={records.map((record, index) => ({
              key: `${record.exerciseId}-${record.type}-${index}`,
              record,
              meta: record.exerciseName,
            }))}
          />
        </RecordCelebration>
      ) : null}
      <View style={styles.tiles}>
        <StatTile label={t('workouts.duration')} value={formatDuration(duration)} />
        <StatTile
          label={t('workouts.volumeLabel')}
          value={formatWeightValue(stats.volumeKg, unit)}
          unit={unit}
          caption={routineComparison?.caption}
          captionIcon={comparison?.routine ? comparisonIcon[comparison.routine.direction] : undefined}
          captionTone={comparison?.routine?.direction === 'up' ? 'success' : 'muted'}
        />
        <StatTile
          label={t('workouts.setsLabel')}
          value={String(stats.doneSets)}
          caption={t('workouts.setsOfTotal', { total: stats.totalSets })}
        />
      </View>
      {stats.durationSeconds > 0 || stats.distanceMeters > 0 ? (
        <View style={styles.tiles}>
          {stats.durationSeconds > 0 ? (
            <StatTile label={t('workouts.setTimeLabel')} value={formatDuration(stats.durationSeconds)} />
          ) : null}
          {stats.distanceMeters > 0 ? (
            <StatTile label={t('workouts.distanceLabel')} value={formatDistance(stats.distanceMeters)} />
          ) : null}
        </View>
      ) : null}
      <Text style={styles.sectionLabel}>{t('workouts.exercisesDone')}</Text>
      {workoutSession.exercises.map((exercise, exerciseIndex) => {
        const exerciseComparison = comparison?.exercises[exercise.exerciseId];
        return (
          <View key={exercise.id} style={styles.card}>
            <CardHeader
              title={exercise.exerciseName}
              trailing={
                exerciseComparison ? (
                  <ComparisonChip
                    comparison={exerciseComparison}
                    unit={unit}
                    language={i18n.language}
                    t={t}
                  />
                ) : null
              }
            />
            {exercise.sets.map((set, setIndex) => {
              const done = isDone(exerciseIndex, setIndex);
              const type = setTypeLabel(set.type, t);
              return (
                <View key={set.id} style={[styles.setRow, done ? null : styles.setRowSkipped]}>
                  <Text style={styles.setOrder}>{set.order}</Text>
                  <Text style={styles.setValue}>
                    {formatSetValues(set, unit, sideLabels(t))}
                  </Text>
                  {type ? (
                    <Chip label={type} size="sm" tone={set.type === 'failure' ? 'record' : 'neutral'} />
                  ) : null}
                  <View style={styles.setSpacer} />
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={done ? colors.successInk : colors.textSubtle}
                  />
                </View>
              );
            })}
          </View>
        );
      })}
      <Button
        label={t('routineDetail.backToRoutines')}
        icon="checkmark-done"
        fullWidth
        onPress={() => leaveTo('/routines')}
      />
      <Button
        label={t('workouts.share.action')}
        icon="share-outline"
        variant="secondary"
        fullWidth
        onPress={() => setIsShareOpen(true)}
      />
      <Button
        label={t('workouts.viewHistory')}
        icon="time-outline"
        variant="secondary"
        fullWidth
        onPress={() => leaveTo('/history')}
      />
      <Button
        label={t('workouts.startAgain')}
        icon="refresh"
        variant="ghost"
        style={styles.centered}
        onPress={() =>
          leaveTo({ pathname: '/workouts/active', params: { routineId: workoutDraft.routineId } })
        }
      />
      {isShareOpen ? (
        <ShareSheet
          visible
          card={buildShareCard(shareInput)}
          onShareText={() => void shareWorkoutText(formatWorkoutShareText(shareInput))}
          onClose={() => setIsShareOpen(false)}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = createStyles(() => ({
  screen: {
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  centered: {
    alignSelf: 'center',
  },
  hero: {
    ...commonStyles.card,
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  heroIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.success,
  },
  heroTitle: {
    ...commonStyles.heading,
    textAlign: 'center',
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionLabel: {
    ...commonStyles.sectionLabel,
    marginTop: spacing.sm,
  },
  card: {
    ...commonStyles.card,
    gap: spacing.xs,
  },
  setRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
  },
  setRowSkipped: {
    opacity: 0.55,
  },
  setOrder: {
    width: 20,
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
  setValue: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
    fontVariant: ['tabular-nums'],
  },
  setSpacer: {
    flex: 1,
  },
}));
