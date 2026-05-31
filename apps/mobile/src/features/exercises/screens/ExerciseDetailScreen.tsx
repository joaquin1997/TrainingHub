import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import { progressClient } from '@/features/progress/api/progressClient';
import { formatDate } from '@/lib/format';
import { colors, commonStyles, spacing } from '@/ui/theme';
import type { Exercise, ExerciseProgressPoint } from '@workout/domain';

const MAX_HISTORY = 8;

function formatHistoryValue(value?: number) {
  return value === undefined ? '-' : String(value);
}

export function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseProgressPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadExercise = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setExercise(null);
      }

      if (!exerciseId) {
        if (shouldUpdate()) {
          setErrorMessage('Missing exercise id.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextExercise = await exercisesClient.getById(exerciseId);

        if (shouldUpdate()) {
          setExercise(nextExercise);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load exercise.',
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [exerciseId],
  );

  useEffect(() => {
    let isActive = true;

    void loadExercise(() => isActive);

    return () => {
      isActive = false;
    };
  }, [loadExercise]);

  useEffect(() => {
    if (!exerciseId) {
      return;
    }

    let isActive = true;

    // Best-effort: a 404 (no logged sessions yet) just leaves history empty.
    progressClient
      .getByExerciseId(exerciseId)
      .then((detail) => {
        if (isActive) {
          setHistory(detail.points);
        }
      })
      .catch(() => {
        if (isActive) {
          setHistory([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [exerciseId]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>Loading exercise...</Text>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{errorMessage ?? 'Exercise not found.'}</Text>
        <Link href="/exercises" style={styles.link}>
          Back to exercises
        </Link>
      </View>
    );
  }

  const primary = exercise.primaryMuscleGroups ?? [];
  const secondary = exercise.secondaryMuscleGroups ?? [];
  const equipment = exercise.equipment ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{exercise.name}</Text>
      {exercise.imageUrl ? (
        <Image
          source={{ uri: exercise.imageUrl }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={`${exercise.name} illustration`}
        />
      ) : null}
      {exercise.description ? (
        <Text style={styles.body}>{exercise.description}</Text>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.meta}>
          Primary muscles: {primary.length > 0 ? primary.join(', ') : '-'}
        </Text>
        <Text style={styles.meta}>
          Secondary muscles: {secondary.length > 0 ? secondary.join(', ') : '-'}
        </Text>
        <Text style={styles.meta}>
          Equipment: {equipment.length > 0 ? equipment.join(', ') : '-'}
        </Text>
      </View>
      {history.length > 0 ? (
        <View style={styles.history}>
          <Text style={styles.sectionTitle}>Recent sessions</Text>
          {history
            .slice()
            .reverse()
            .slice(0, MAX_HISTORY)
            .map((point, index) => (
              <View key={`${point.date}-${index}`} style={styles.historyRow}>
                <Text style={styles.historyDate}>{formatDate(point.date)}</Text>
                <Text style={styles.historyValue}>
                  {formatHistoryValue(point.bestWeightKg)} kg x{' '}
                  {formatHistoryValue(point.bestReps)}
                </Text>
              </View>
            ))}
          <Link href={`/progress/exercises/${exercise.id}`} style={styles.link}>
            View full progress
          </Link>
        </View>
      ) : null}
      <Link href="/exercises" style={styles.link}>
        Back to exercises
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
    ...commonStyles.body,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  card: {
    ...commonStyles.card,
  },
  history: {
    ...commonStyles.card,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: 14,
  },
  historyValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    ...commonStyles.meta,
  },
  error: {
    ...commonStyles.error,
  },
  link: {
    ...commonStyles.link,
  },
});
