import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

type RouteKey =
  | 'auth'
  | 'routines'
  | 'routine-detail'
  | 'active-workout'
  | 'progress';

type RouteLinksProps = {
  currentRoute: RouteKey;
};

const ROUTES: Array<{
  href: '/auth' | '/routines' | '/routines/sample-routine' | '/workouts/active' | '/progress';
  key: RouteKey;
  label: string;
}> = [
  { href: '/auth', key: 'auth', label: 'Auth landing' },
  { href: '/routines', key: 'routines', label: 'Routines list' },
  {
    href: '/routines/sample-routine',
    key: 'routine-detail',
    label: 'Routine detail',
  },
  {
    href: '/workouts/active',
    key: 'active-workout',
    label: 'Active workout',
  },
  { href: '/progress', key: 'progress', label: 'Progress overview' },
];

export function RouteLinks({ currentRoute }: RouteLinksProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Routes</Text>
      {ROUTES.map((route) =>
        route.key === currentRoute ? (
          <Text key={route.key} style={styles.current}>
            Current: {route.label}
          </Text>
        ) : (
          <Link key={route.key} href={route.href} style={styles.link}>
            Open {route.label}
          </Link>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
  },
  current: {
    fontSize: 15,
    color: '#111827',
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
});

