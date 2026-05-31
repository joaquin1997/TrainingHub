import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SettingsProvider } from '@/features/settings/SettingsContext';
import { colors, screenHeader } from '@/ui/theme';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
          ...screenHeader,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/index" options={{ title: 'TrainingHub' }} />
        <Stack.Screen
          name="workouts/active"
          options={{ title: 'Active Workout' }}
        />
        <Stack.Screen
          name="workouts/summary"
          options={{ title: 'Workout Saved' }}
        />
        <Stack.Screen name="workouts/[workoutId]" options={{ title: 'Workout' }} />
      </Stack>
    </SettingsProvider>
  );
}
