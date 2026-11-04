import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { screenHeader } from '@/ui/theme';

export default function ExercisesStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={screenHeader}>
      <Stack.Screen name="index" options={{ title: t('nav.exercises'), headerShown: false }} />
      <Stack.Screen name="[exerciseId]/progress" options={{ title: t('nav.exerciseProgress') }} />
      <Stack.Screen name="[exerciseId]" options={{ title: t('nav.exercise') }} />
    </Stack>
  );
}
