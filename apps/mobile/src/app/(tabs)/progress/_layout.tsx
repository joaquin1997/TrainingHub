import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { screenHeader } from '@/ui/theme';

export default function ProgressStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={screenHeader}>
      <Stack.Screen name="index" options={{ title: t('nav.progress'), headerShown: false }} />
      <Stack.Screen
        name="exercises/[exerciseId]"
        options={{ title: t('nav.exerciseProgress') }}
      />
    </Stack>
  );
}
