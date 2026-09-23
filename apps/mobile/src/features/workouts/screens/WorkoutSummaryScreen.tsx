import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  clearLatestCompletedWorkout,
  getLatestCompletedWorkout,
  toWorkoutSessionSkeleton,
} from '@/features/workouts/state/workoutDraftStore';
import { colors, commonStyles, spacing } from '@/ui/theme';

export function WorkoutSummaryScreen() {
  const { t } = useTranslation();
  const workoutDraft = getLatestCompletedWorkout();

  if (!workoutDraft) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{t('workouts.noCompleted')}</Text>
        <Link href="/routines" style={styles.link}>
          {t('routineDetail.backToRoutines')}
        </Link>
      </View>
    );
  }

  const workoutSession = toWorkoutSessionSkeleton(workoutDraft);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.body}>{workoutDraft.routineName}</Text>
      <Text style={styles.meta}>{t('workouts.savedToHistory')}</Text>
      <Text style={styles.meta}>
        {t('workouts.sessionId', { id: workoutSession.id })}
      </Text>
      {workoutDraft.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
          {exercise.entries.map((set) => (
            <Text key={set.id} style={styles.setText}>
              {t('workouts.setSummary', {
                order: set.order,
                reps: set.reps || '-',
                weight: set.weightKg || '-',
                unit: workoutDraft.unit ?? 'kg',
              })}
            </Text>
          ))}
        </View>
      ))}
      <View style={styles.links}>
        <Link
          href="/routines"
          style={styles.link}
          onPress={() => {
            clearLatestCompletedWorkout();
          }}
        >
          {t('routineDetail.backToRoutines')}
        </Link>
        <Link
          href="/history"
          style={styles.link}
          onPress={() => {
            clearLatestCompletedWorkout();
          }}
        >
          {t('workouts.viewHistory')}
        </Link>
        <Link
          href={{
            pathname: '/workouts/active',
            params: { routineId: workoutDraft.routineId },
          }}
          style={styles.link}
          onPress={() => {
            clearLatestCompletedWorkout();
          }}
        >
          {t('workouts.startAgain')}
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.scrollContent,
  },
  title: {
    ...commonStyles.title,
  },
  body: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  meta: {
    ...commonStyles.meta,
  },
  card: {
    ...commonStyles.card,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  setText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  link: {
    ...commonStyles.link,
  },
});
