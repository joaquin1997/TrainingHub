import { Stack } from 'expo-router';

import { screenHeader } from '@/ui/theme';

export default function RoutinesStackLayout() {
  return (
    <Stack screenOptions={screenHeader}>
      <Stack.Screen name="index" options={{ title: 'Routines' }} />
      <Stack.Screen name="create" options={{ title: 'Create Routine' }} />
      <Stack.Screen name="[routineId]" options={{ title: 'Routine' }} />
      <Stack.Screen name="edit/[routineId]" options={{ title: 'Edit Routine' }} />
    </Stack>
  );
}
