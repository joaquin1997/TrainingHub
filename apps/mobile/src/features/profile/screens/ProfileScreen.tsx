import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { useProfileData } from '@/features/profile/useProfileData';
import { useSettings } from '@/features/settings/SettingsContext';
import { formatHeight } from '@/lib/length';
import { Button } from '@/ui/Button';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, spacing } from '@/ui/theme';

/** The person's profile (spec 0027), reached from the Settings account card. */
export function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings } = useSettings();
  const unit = settings.unit;
  const { profile, isLoading, error, reload } = useProfileData();

  if (!profile) {
    return (
      <View style={commonStyles.fixedContent}>
        {isLoading ? (
          <StateView kind="loading" message={t('common.loading')} />
        ) : (
          <StateView
            kind="error"
            message={error ?? t('profile.loadError')}
            actionLabel={t('common.retry')}
            onAction={() => void reload()}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.identity}>
        <ProfileAvatar photoDataUrl={profile.photoDataUrl} name={profile.displayName} size={96} />
        <Text style={styles.name}>{profile.displayName}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <View style={styles.factRow}>
          <Text style={styles.factLabel}>{t('profile.height')}</Text>
          <Text style={styles.factValue}>
            {profile.heightCm ? formatHeight(profile.heightCm, unit) : t('profile.noHeight')}
          </Text>
        </View>
        <Button
          label={t('profile.editProfile')}
          icon="create-outline"
          variant="secondary"
          onPress={() => router.push('/settings/profile-edit')}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  identity: {
    ...commonStyles.card,
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    ...commonStyles.heading,
    textAlign: 'center',
  },
  bio: {
    ...commonStyles.body,
    textAlign: 'center',
  },
  factRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  factLabel: {
    ...commonStyles.meta,
  },
  factValue: {
    ...commonStyles.label,
  },
});
