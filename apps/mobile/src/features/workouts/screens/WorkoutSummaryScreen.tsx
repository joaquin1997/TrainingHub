import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  clearLatestCompletedWorkout,
  getLatestCompletedWorkout,
  toWorkoutSessionSkeleton,
} from '@/features/workouts/state/workoutDraftStore';
import { colors, commonStyles, spacing } from '@/ui/theme';

export function WorkoutSummaryScreen() {
  const workoutDraft = getLatestCompletedWorkout();

  if (!workoutDraft) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>
          No completed workout is stored in the local mock flow yet.
        </Text>
        <Link href="/routines" style={styles.link}>
          Back to routines
        </Link>
      </View>
    );
  }

  const workoutSession = toWorkoutSessionSkeleton(workoutDraft);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.body}>{workoutDraft.routineName}</Text>
      <Text style={styles.meta}>Saved to history.</Text>
      <Text style={styles.meta}>Session ID: {workoutSession.id}</Text>
      {workoutDraft.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
          {exercise.entries.map((set) => (
            <Text key={set.id} style={styles.setText}>
              Set {set.order}: {set.reps || '-'} reps, {set.weightKg || '-'} kg
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
          Back to routines
        </Link>
        <Link
          href="/history"
          style={styles.link}
          onPress={() => {
            clearLatestCompletedWorkout();
          }}
        >
          View history
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
          Start again
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
