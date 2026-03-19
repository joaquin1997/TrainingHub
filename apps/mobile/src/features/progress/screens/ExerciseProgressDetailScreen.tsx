import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { findMockExerciseProgress } from '@/features/progress/mocks/mockProgress';

export function ExerciseProgressDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const progress = findMockExerciseProgress(exerciseId);

  if (!progress) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Exercise Progress</Text>
        <Text style={styles.body}>
          Progress data is not available for this exercise yet.
        </Text>
        <Link href="/progress" style={styles.link}>
          Back to progress
        </Link>
        <RouteLinks currentRoute="progress" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exercise Progress</Text>
      <Text style={styles.body}>{progress.exerciseName}</Text>
      <Text style={styles.meta}>
        Latest logged result: {progress.latestWeightKg} kg x{' '}
        {progress.latestReps}
      </Text>
      <Text style={styles.meta}>
        Personal best: {progress.personalBestWeightKg} kg x{' '}
        {progress.personalBestReps}
      </Text>
      <Text style={styles.meta}>{progress.trendLabel}</Text>
      <Text style={styles.meta}>{progress.lastUpdatedLabel}</Text>
      <Text style={styles.todo}>
        TODO: Replace placeholder values with API-backed progress history.
      </Text>
      <Link href="/progress" style={styles.link}>
        Back to progress
      </Link>
      <RouteLinks currentRoute="progress" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  todo: {
    fontSize: 14,
    color: '#4b5563',
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
});
