import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { SettingsProvider } from '@/features/settings/SettingsContext';
import { useLiveWorkoutController } from '@/features/workouts/liveActivity/useLiveWorkoutController';
import { useActiveWorkoutPersistence } from '@/features/workouts/persistence/useActiveWorkoutPersistence';
import { getActiveWorkout } from '@/features/workouts/state/workoutDraftStore';
import { I18nProvider } from '@/i18n/I18nProvider';
import { colors, screenHeader } from '@/ui/theme';

function RootNavigator() {
  const { user, isAuthenticated, isLoading } = useAuth();
  // The stored workout is restored before any screen can read it (spec 0010).
  const isRestoringWorkout = useActiveWorkoutPersistence(user?.id ?? null);
  // The lock-screen status follows the active workout once it is restored.
  useLiveWorkoutController(isAuthenticated && !isRestoringWorkout);
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();

  const inAuthGroup = segments[0] === 'auth';

  useEffect(() => {
    // Wait for the stored workout too: after sign-in the app only leaves the
    // auth screen once it is restored (spec 0010 EF-6).
    if (isLoading || isRestoringWorkout) {
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/routines');
      // Back to the workout in progress after signing in, e.g. when the
      // lock-screen status was tapped with an expired session (spec 0012
      // EF-7). Pushed over Routines so Back works.
      if (getActiveWorkout()) {
        router.push('/workouts/active');
      }
    }
  }, [inAuthGroup, isAuthenticated, isLoading, isRestoringWorkout, router]);

  // On the auth screen the navigator stays mounted while the workout restores.
  if (isLoading || (isRestoringWorkout && !inAuthGroup)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: 'minimal',
        ...screenHeader,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/index" options={{ headerShown: false }} />
      <Stack.Screen name="workouts/active" options={{ title: t('nav.activeWorkout') }} />
      <Stack.Screen name="workouts/summary" options={{ title: t('nav.workoutSaved') }} />
      <Stack.Screen name="workouts/[workoutId]" options={{ title: t('nav.workout') }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <I18nProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </I18nProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
