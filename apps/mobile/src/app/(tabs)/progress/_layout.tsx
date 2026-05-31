import { Stack } from 'expo-router';

import { screenHeader } from '@/ui/theme';

export default function ProgressStackLayout() {
  return (
    <Stack screenOptions={screenHeader}>
      <Stack.Screen name="index" options={{ title: 'Progress' }} />
      <Stack.Screen
        name="exercises/[exerciseId]"
        options={{ title: 'Exercise Progress' }}
      />
    </Stack>
  );
}
