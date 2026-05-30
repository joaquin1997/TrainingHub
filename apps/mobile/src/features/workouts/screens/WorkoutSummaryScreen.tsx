import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import {
  clearLatestCompletedWorkout,
  getLatestCompletedWorkout,
  toWorkoutSessionSkeleton,
} from '@/features/workouts/state/workoutDraftStore';

export function WorkoutSummaryScreen() {
  const workoutDraft = getLatestCompletedWorkout();

  if (!workoutDraft) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Workout Summary</Text>
        <Text style={styles.body}>
          No completed workout is stored in the local mock flow yet.
        </Text>
        <Link href="/routines" style={styles.link}>
          Back to routines
        </Link>
        <RouteLinks currentRoute="workout-summary" />
      </View>
    );
  }

  const workoutSession = toWorkoutSessionSkeleton(workoutDraft);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Workout Summary</Text>
      <Text style={styles.body}>{workoutDraft.routineName}</Text>
      <Text style={styles.meta}>This workout was saved to your history.</Text>
      <Text style={styles.meta}>Workout session ID: {workoutSession.id}</Text>
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
      <Text style={styles.todo}>
        TODO: Surface Apple Health sync status here once native sync is wired.
      </Text>
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
          href="/workouts/history"
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
      <RouteLinks currentRoute="workout-summary" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  body: {
    fontSize: 24,
    fontWeight: '600',
  },
  meta: {
    fontSize: 14,
    color: '#4b5563',
  },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  setText: {
    fontSize: 14,
    lineHeight: 20,
  },
  todo: {
    fontSize: 14,
    color: '#4b5563',
  },
  links: {
    flexDirection: 'row',
    gap: 16,
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
});
