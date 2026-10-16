import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { screenHeader } from '@/ui/theme';

/** Settings and the profile it leads to (spec 0027), with the tab bar kept. */
export default function SettingsStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={screenHeader}>
      <Stack.Screen name="index" options={{ title: t('nav.settings'), headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: t('nav.profile') }} />
      <Stack.Screen name="profile-edit" options={{ title: t('nav.editProfile') }} />
    </Stack>
  );
}
