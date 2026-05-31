import { Stack } from 'expo-router';

import { screenHeader } from '@/ui/theme';

export default function ExercisesStackLayout() {
  return (
    <Stack screenOptions={screenHeader}>
      <Stack.Screen name="index" options={{ title: 'Exercises' }} />
      <Stack.Screen name="[exerciseId]" options={{ title: 'Exercise' }} />
    </Stack>
  );
}
