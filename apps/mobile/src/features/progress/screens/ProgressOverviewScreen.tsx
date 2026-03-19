import { StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';

export function ProgressOverviewScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress Overview</Text>
      <Text style={styles.body}>
        Placeholder screen for high-level training progress.
      </Text>
      <Text style={styles.todo}>
        TODO: Keep progress calculations out of the router layer when this
        feature is implemented.
      </Text>
      <RouteLinks currentRoute="progress" />
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
