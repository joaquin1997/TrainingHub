import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';

export function RoutineDetailScreen() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Routine Detail</Text>
      <Text style={styles.body}>
        Placeholder screen for a single routine template.
      </Text>
      <Text style={styles.meta}>Routine ID: {routineId ?? 'unknown'}</Text>
      <Text style={styles.todo}>
        TODO: Keep routine templates separate from performed workout sessions.
      </Text>
      <RouteLinks currentRoute="routine-detail" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
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
  meta: {
    fontSize: 14,
    color: '#4b5563',
  },
  todo: {
    fontSize: 14,
    color: '#4b5563',
  },
});
