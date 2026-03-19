import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/index" options={{ title: 'Auth' }} />
      <Stack.Screen name="routines/index" options={{ title: 'Routines' }} />
      <Stack.Screen name="routines/create" options={{ title: 'Create Routine' }} />
      <Stack.Screen
        name="routines/[routineId]"
        options={{ title: 'Routine Detail' }}
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
        options={{ title: 'Workout Summary' }}
      />
      <Stack.Screen name="progress/index" options={{ title: 'Progress' }} />
      <Stack.Screen
        name="progress/exercises/[exerciseId]"
        options={{ title: 'Exercise Progress' }}
      />
    </Stack>
  );
}
