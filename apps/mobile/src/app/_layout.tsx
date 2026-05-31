import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/ui/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '800',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/index" options={{ title: 'TrainingHub' }} />
        <Stack.Screen name="routines/index" options={{ title: 'Routines' }} />
        <Stack.Screen name="exercises/index" options={{ title: 'Exercises' }} />
        <Stack.Screen
          name="exercises/[exerciseId]"
          options={{ title: 'Exercise' }}
        />
        <Stack.Screen
          name="routines/create"
          options={{ title: 'Create Routine' }}
        />
        <Stack.Screen
          name="routines/[routineId]"
          options={{ title: 'Routine' }}
        />
        <Stack.Screen
          name="routines/edit/[routineId]"
          options={{ title: 'Edit Routine' }}
        />
        <Stack.Screen
          name="workouts/active"
          options={{ title: 'Active Workout' }}
        />
        <Stack.Screen
          name="workouts/summary"
          options={{ title: 'Workout Saved' }}
        />
        <Stack.Screen
          name="workouts/history"
          options={{ title: 'History' }}
        />
        <Stack.Screen
          name="workouts/[workoutId]"
          options={{ title: 'Workout' }}
        />
        <Stack.Screen name="progress/index" options={{ title: 'Progress' }} />
        <Stack.Screen
          name="progress/exercises/[exerciseId]"
          options={{ title: 'Exercise Progress' }}
        />
      </Stack>
    </>
  );
}
