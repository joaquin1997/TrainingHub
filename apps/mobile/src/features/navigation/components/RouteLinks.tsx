import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/ui/theme';

type RouteKey =
  | 'auth'
  | 'routines'
  | 'routine-detail'
  | 'exercises'
  | 'active-workout'
  | 'workout-summary'
  | 'workout-history'
  | 'progress';

type RouteLinksProps = {
  currentRoute: RouteKey;
};

const ROUTES: Array<{
  href:
    | '/routines'
    | '/exercises'
    | '/workouts/history'
    | '/progress';
  key: RouteKey;
  label: string;
}> = [
  { href: '/routines', key: 'routines', label: 'Routines' },
  { href: '/exercises', key: 'exercises', label: 'Exercises' },
  { href: '/progress', key: 'progress', label: 'Progress' },
  {
    href: '/workouts/history',
    key: 'workout-history',
    label: 'History',
  },
];

function isActive(routeKey: RouteKey, currentRoute: RouteKey) {
  if (routeKey === currentRoute) {
    return true;
  }

  if (routeKey === 'routines') {
    return (
      currentRoute === 'routine-detail' ||
      currentRoute === 'active-workout' ||
      currentRoute === 'workout-summary'
    );
  }

  return false;
}

export function RouteLinks({ currentRoute }: RouteLinksProps) {
  return (
    <View style={styles.container}>
      {ROUTES.map((route) => {
        const active = isActive(route.key, currentRoute);

        return (
          <Link key={route.key} href={route.href} asChild>
            <Pressable
              style={({ pressed }) => [
                styles.link,
                active ? styles.current : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[styles.linkText, active ? styles.currentText : null]}
              >
                {route.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.xs,
  },
  link: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  current: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.82,
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  currentText: {
    color: colors.onPrimary,
  },
});
