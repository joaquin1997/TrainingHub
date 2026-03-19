import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { listMockExerciseProgress } from '@/features/progress/mocks/mockProgress';

export function ProgressOverviewScreen() {
  const exerciseProgress = listMockExerciseProgress();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress Overview</Text>
      <Text style={styles.body}>
        Minimal placeholder view of exercise progress, ready to connect to the
        backend later.
      </Text>
      <View style={styles.list}>
        {exerciseProgress.map((progress) => (
          <View key={progress.exerciseId} style={styles.card}>
            <Text style={styles.cardTitle}>{progress.exerciseName}</Text>
            <Text style={styles.meta}>
              Latest: {progress.latestWeightKg} kg x {progress.latestReps}
            </Text>
            <Text style={styles.meta}>
              Best: {progress.personalBestWeightKg} kg x{' '}
              {progress.personalBestReps}
            </Text>
            <Link
              href={`/progress/exercises/${progress.exerciseId}`}
              style={styles.link}
            >
              Open exercise progress
            </Link>
          </View>
        ))}
      </View>
      <Text style={styles.todo}>
        TODO: Keep real progress calculations and aggregation in the backend.
      </Text>
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
    fontSize: 16,
    lineHeight: 22,
  },
  list: {
    gap: 12,
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
  meta: {
    fontSize: 14,
    color: '#4b5563',
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
  todo: {
    fontSize: 14,
    color: '#4b5563',
  },
});
