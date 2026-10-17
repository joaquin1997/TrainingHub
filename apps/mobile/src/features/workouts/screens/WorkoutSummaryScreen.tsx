import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { progressClient } from '@/features/progress/api/progressClient';
import { RecordsCard } from '@/features/progress/components/RecordsCard';
import {
  clearLatestCompletedWorkout,
  getLatestCompletedWorkout,
  toWorkoutSessionSkeleton,
} from '@/features/workouts/state/workoutDraftStore';
import { formatWorkoutShareText, shareRecords } from '@/features/workouts/utils/shareText';
import { shareWorkoutText } from '@/features/workouts/utils/shareWorkout';
import { summarizeSession } from '@/features/workouts/utils/sessionStats';
import { activeDurationSeconds, formatDuration } from '@/lib/format';
import { formatDistance, formatSetValues } from '@/lib/tracking';
import { formatWeightValue } from '@/lib/weight';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StatTile } from '@/ui/StatTile';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';
import type { SessionRecord, WorkoutSetType } from '@workout/domain';

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

export function WorkoutSummaryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const workoutDraft = getLatestCompletedWorkout();
  const clientId = workoutDraft?.clientId;
  const [records, setRecords] = useState<SessionRecord[]>([]);

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

  const leaveTo = (path: Parameters<typeof router.replace>[0]) => {
    clearLatestCompletedWorkout();
    router.replace(path);
  };

  if (!workoutDraft) {
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
  const workoutSession = toWorkoutSessionSkeleton(workoutDraft);
  const unit = workoutDraft.unit ?? 'kg';
  const isDone = (exerciseIndex: number, setIndex: number) =>
    workoutDraft.exercises[exerciseIndex]?.entries[setIndex]?.done ?? false;
  const stats = summarizeSession({
    exercises: workoutSession.exercises.map((exercise, exerciseIndex) => ({
      sets: exercise.sets.map((set, setIndex) => ({
        ...set,
        performed: isDone(exerciseIndex, setIndex),
      })),
    })),
  });
  const duration = activeDurationSeconds(
    workoutSession.startedAt,
    workoutSession.completedAt,
    workoutSession.pausedSeconds,
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="trophy" size={28} color={colors.onPrimary} />
        </View>
        <Text style={styles.heroTitle}>{workoutDraft.routineName}</Text>
        <Chip icon="checkmark-circle" tone="done" label={t('workouts.savedToHistory')} />
      </View>
      <View style={styles.tiles}>
        <StatTile label={t('workouts.duration')} value={formatDuration(duration)} />
        <StatTile
          label={t('workouts.volumeLabel')}
          value={formatWeightValue(stats.volumeKg, unit)}
          unit={unit}
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
      <RecordsCard
        title={t('progress.records.beaten')}
        unit={unit}
        items={records.map((record, index) => ({
          key: `${record.exerciseId}-${record.type}-${index}`,
          record,
          meta: record.exerciseName,
        }))}
      />
      <Text style={styles.sectionLabel}>{t('workouts.exercisesDone')}</Text>
      {workoutSession.exercises.map((exercise, exerciseIndex) => (
        <View key={exercise.id} style={styles.card}>
          <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
          {exercise.sets.map((set, setIndex) => {
            const done = isDone(exerciseIndex, setIndex);
            const type = setTypeLabel(set.type, t);
            return (
              <View key={set.id} style={[styles.setRow, done ? null : styles.setRowSkipped]}>
                <Text style={styles.setOrder}>{set.order}</Text>
                <Text style={styles.setValue}>
                  {formatSetValues(set, unit)}
                </Text>
                {type ? (
                  <Chip label={type} size="sm" tone={set.type === 'failure' ? 'record' : 'neutral'} />
                ) : null}
                <View style={styles.setSpacer} />
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={done ? colors.success : colors.textSubtle}
                />
              </View>
            );
          })}
        </View>
      ))}
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
        onPress={() =>
          void shareWorkoutText(
            formatWorkoutShareText({
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
            }),
          )
        }
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 32,
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
  cardTitle: {
    ...commonStyles.cardTitle,
    marginBottom: spacing.xs,
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
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  setValue: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  setSpacer: {
    flex: 1,
  },
});
