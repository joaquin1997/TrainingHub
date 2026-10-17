import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { FirstRunContext, useFirstRunGate } from '@/features/onboarding/useFirstRunGate';
import { SettingsProvider } from '@/features/settings/SettingsContext';
import { useLiveWorkoutController } from '@/features/workouts/liveActivity/useLiveWorkoutController';
import { useActiveWorkoutPersistence } from '@/features/workouts/persistence/useActiveWorkoutPersistence';
import { useRestTimerRunner } from '@/features/workouts/restTimer/useRestTimerRunner';
import { getActiveWorkout } from '@/features/workouts/state/workoutDraftStore';
import { I18nProvider } from '@/i18n/I18nProvider';
import { ThemeProvider } from '@/ui/ThemeProvider';
import { colors, fontAssets, screenHeader, useTheme } from '@/ui/theme';

// The branded splash stays up until the first real screen is ready, so there
// is no blank or spinner frame in between (spec 0034 FR-2). A no-op on web and
// on a binary built before the module was added.
SplashScreen.setOptions({ fade: true, duration: 200 });
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
/** Never keep the splash longer than this, whatever is still loading. */
const SPLASH_MAX_MS = 5000;
const splashTimeout = setTimeout(() => SplashScreen.hide(), SPLASH_MAX_MS);

function hideSplash() {
  clearTimeout(splashTimeout);
  SplashScreen.hide();
}

/** Mounted with the first real screen; takes the splash down. */
function SplashHandOver() {
  useTheme();
  useEffect(() => {
    hideSplash();
  }, []);
  return null;
}

function RootNavigator() {
  useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  // The stored workout is restored before any screen can read it (spec 0010).
  const isRestoringWorkout = useActiveWorkoutPersistence(user?.id ?? null);
  // The lock-screen status follows the active workout once it is restored.
  useLiveWorkoutController(isAuthenticated && !isRestoringWorkout);
  // The rest timer keeps counting and alerting on every screen (spec 0018).
  useRestTimerRunner(isAuthenticated && !isRestoringWorkout);
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();
  // The first run, decided once per sign-in or app start (spec 0037 FR-1, FR-4).
  const firstRun = useFirstRunGate({
    userId: user?.id ?? null,
    ready: isAuthenticated && !isRestoringWorkout,
  });

  const inAuthGroup = segments[0] === 'auth';
  const inFirstRun = segments[0] === 'first-run';

  useEffect(() => {
    // Wait for the stored workout too: after sign-in the app only leaves the
    // auth screen once it is restored (spec 0010 EF-6).
    if (isLoading || isRestoringWorkout) {
      return;
    }

    if (isAuthenticated && firstRun.status === 'deciding') {
      return;
    }

    if (isAuthenticated && firstRun.status === 'show') {
      if (!inFirstRun) {
        router.replace('/first-run');
      }
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
  }, [inAuthGroup, inFirstRun, isAuthenticated, isLoading, isRestoringWorkout, firstRun.status, router]);

  // On the auth screen the navigator stays mounted while the workout restores
  // and while the first run is decided, so Routines never flashes before it.
  if (
    isLoading ||
    (isRestoringWorkout && !inAuthGroup) ||
    (firstRun.status === 'deciding' && !inAuthGroup)
  ) {
    return <StartupSpinner />;
  }

  return (
    <FirstRunContext.Provider value={firstRun}>
    <SplashHandOver />
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
      <Stack.Screen name="first-run" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="workouts/active" options={{ title: t('nav.activeWorkout') }} />
      <Stack.Screen name="workouts/summary" options={{ title: t('nav.workoutSaved') }} />
      <Stack.Screen name="workouts/[workoutId]" options={{ title: t('nav.workout') }} />
    </Stack>
    </FirstRunContext.Provider>
  );
}

function StartupSpinner() {
  useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator color={colors.primaryInk} />
    </View>
  );
}

export default function RootLayout() {
  useTheme();
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontError) {
      // The app keeps working in the system typeface (spec 0017 EF-4).
      console.warn('[fonts] display typeface failed to load', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return <StartupSpinner />;
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <ThemeProvider>
          <I18nProvider>
            <RootNavigator />
          </I18nProvider>
        </ThemeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
