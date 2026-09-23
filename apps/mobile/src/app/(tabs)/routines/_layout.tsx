import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { screenHeader } from '@/ui/theme';

export default function RoutinesStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={screenHeader}>
      <Stack.Screen name="index" options={{ title: t('nav.routines') }} />
      <Stack.Screen name="create" options={{ title: t('nav.createRoutine') }} />
      <Stack.Screen name="[routineId]" options={{ title: t('nav.routine') }} />
      <Stack.Screen name="edit/[routineId]" options={{ title: t('nav.editRoutine') }} />
    </Stack>
  );
}
