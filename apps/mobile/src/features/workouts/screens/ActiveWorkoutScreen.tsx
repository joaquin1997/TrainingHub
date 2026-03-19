import { StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';

export function ActiveWorkoutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Workout</Text>
      <Text style={styles.body}>
        Placeholder screen for an in-progress workout session.
      </Text>
      <Text style={styles.todo}>
        TODO: Add local session state only when workout flow scaffolding is
        requested.
      </Text>
      <RouteLinks currentRoute="active-workout" />
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
  todo: {
    fontSize: 14,
    color: '#4b5563',
  },
});
