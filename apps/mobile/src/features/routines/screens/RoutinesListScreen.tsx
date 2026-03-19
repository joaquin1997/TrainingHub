import { StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';

export function RoutinesListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Routines List</Text>
      <Text style={styles.body}>
        Placeholder screen for routine listing and creation entry points.
      </Text>
      <Text style={styles.todo}>
        TODO: Replace placeholder links with routine data once the feature is
        scaffolded.
      </Text>
      <RouteLinks currentRoute="routines" />
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
