import { StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';

export function AuthLandingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth Landing</Text>
      <Text style={styles.body}>
        Placeholder screen for the initial authentication flow.
      </Text>
      <Text style={styles.todo}>
        TODO: Add Apple sign-in provider wiring behind an auth abstraction.
      </Text>
      <RouteLinks currentRoute="auth" />
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
