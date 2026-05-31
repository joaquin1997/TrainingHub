import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/features/settings/SettingsContext';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import {
  durationSecondsBetween,
  formatDateTime,
  formatDuration,
} from '@/lib/format';
import { formatWeightValue, fromKg, roundWeight } from '@/lib/weight';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import type { WorkoutSession, WorkoutSet } from '@workout/domain';

function setTypeLabel(type: WorkoutSet['type']) {
  switch (type) {
    case 'warmup':
      return 'Warmup';
    case 'drop':
      return 'Drop';
    case 'failure':
      return 'Failure';
    default:
      return null;
  }
}

const isDone = (set: WorkoutSet) => Boolean(set.completedAt);
const setVolume = (set: WorkoutSet) => (set.reps ?? 0) * (set.weightKg ?? 0);

function summarize(session: WorkoutSession) {
  let totalSets = 0;
  let doneSets = 0;
  let volume = 0;
  let restSeconds = 0;

  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      totalSets += 1;
      if (isDone(set)) {
        doneSets += 1;
        volume += setVolume(set);
        restSeconds += set.restSeconds ?? 0;
      }
    }
  }

  return { totalSets, doneSets, volume: Math.round(volume), restSeconds };
}

const exerciseVolume = (exercise: WorkoutSession['exercises'][number]) =>
  Math.round(
    exercise.sets.reduce(
      (sum, set) => sum + (isDone(set) ? setVolume(set) : 0),
      0,
    ),
  );

export function WorkoutSessionDetailScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const { settings } = useSettings();
  const unit = settings.unit;

  const loadSession = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setSession(null);
      }

      if (!workoutId) {
        if (shouldUpdate()) {
          setErrorMessage('Missing workout id.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextSession = await workoutsClient.getById(workoutId);

        if (shouldUpdate()) {
          if (!nextSession) {
            setErrorMessage('Workout not found.');
            return;
          }

          setSession(nextSession);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load workout.',
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [workoutId],
  );

  useEffect(() => {
    let isActive = true;

    void loadSession(() => isActive);

    return () => {
      isActive = false;
    };
  }, [loadSession]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>Loading workout...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>
          {errorMessage ?? 'Workout not found.'}
        </Text>
        <Link href="/history" style={styles.link}>
          Back to history
        </Link>
      </View>
    );
  }

  const totals = summarize(session);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.body}>
        {formatDateTime(session.completedAt ?? session.startedAt)}
      </Text>
      {session.notes ? (
        <Text style={styles.notes}>{session.notes}</Text>
      ) : null}

      {/* Session summary of what was actually done. */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>
            {session.completedAt
              ? formatDuration(
                  durationSecondsBetween(session.startedAt, session.completedAt),
                )
              : '–'}
          </Text>
          <Text style={styles.summaryLabel}>Duration</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>
            {totals.doneSets}/{totals.totalSets}
          </Text>
          <Text style={styles.summaryLabel}>Sets done</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>
            {roundWeight(fromKg(totals.volume, unit))}
          </Text>
          <Text style={styles.summaryLabel}>Volume {unit}</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>
            {totals.restSeconds > 0 ? formatDuration(totals.restSeconds) : '–'}
          </Text>
          <Text style={styles.summaryLabel}>Rest</Text>
        </View>
      </View>

      {session.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.cardTitle}>
              {exercise.order}. {exercise.exerciseName}
            </Text>
            <Text style={styles.exerciseVolume}>
              {roundWeight(fromKg(exerciseVolume(exercise), unit))} {unit}
            </Text>
          </View>
          {exercise.sets.map((set) => {
            const type = setTypeLabel(set.type);
            const done = isDone(set);
            return (
              <View key={set.id} style={styles.setRow}>
                <Text style={[styles.setCheck, done ? styles.setCheckDone : null]}>
                  {done ? '✓' : '○'}
                </Text>
                <Text style={styles.setNum}>{set.order}</Text>
                {type ? <Text style={styles.typeTag}>{type}</Text> : null}
                <Text style={styles.setValue}>
                  {formatWeightValue(set.weightKg, unit)} {unit} × {set.reps ?? '–'}
                </Text>
                {set.restSeconds ? (
                  <Text style={styles.setRest}>
                    rest {formatDuration(set.restSeconds)}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
      <Link href="/history" style={styles.link}>
        Back to history
      </Link>
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
  title: {
    ...commonStyles.title,
  },
  body: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  notes: {
    ...commonStyles.meta,
  },
  meta: {
    ...commonStyles.meta,
  },
  error: {
    ...commonStyles.error,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  summaryValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    ...commonStyles.card,
    gap: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  exerciseVolume: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setCheck: {
    color: colors.textSubtle,
    fontSize: 15,
    width: 16,
  },
  setCheckDone: {
    color: colors.success,
  },
  setNum: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    width: 16,
  },
  typeTag: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  setValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  setRest: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  link: {
    ...commonStyles.link,
  },
});
