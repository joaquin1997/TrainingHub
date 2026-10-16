import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { profileClient } from '@/features/profile/api/profileClient';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { pickProfilePhoto } from '@/features/profile/photo/pickProfilePhoto';
import { useProfileData } from '@/features/profile/useProfileData';
import { useSettings } from '@/features/settings/SettingsContext';
import { formatHeight } from '@/lib/length';
import { ActionSheet, type SheetAction } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, spacing } from '@/ui/theme';

/** The person's profile (spec 0027), reached from the Settings account card. */
export function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings } = useSettings();
  const unit = settings.unit;
  const { profile, setProfile, isLoading, error, reload } = useProfileData();
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string>();

  const changePhoto = async (action: 'choose' | 'remove') => {
    setPhotoSheetOpen(false);
    setPhotoError(undefined);
    try {
      let next;
      if (action === 'remove') {
        setPhotoBusy(true);
        next = await profileClient.removePhoto();
      } else {
        // Let the sheet finish closing: iOS cannot present the picker over a
        // modal that is still dismissing.
        await new Promise((resolve) => setTimeout(resolve, 350));
        const imageBase64 = await pickProfilePhoto();
        if (!imageBase64) {
          return;
        }
        setPhotoBusy(true);
        next = await profileClient.setPhoto(imageBase64);
      }
      setProfile(next);
    } catch {
      setPhotoError(t('profile.photoError'));
    } finally {
      setPhotoBusy(false);
    }
  };

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.changePhoto')}
          onPress={() => setPhotoSheetOpen(true)}
          disabled={photoBusy}
          style={({ pressed }) => [styles.photo, pressed || photoBusy ? commonStyles.pressed : null]}
        >
          <ProfileAvatar photoDataUrl={profile.photoDataUrl} name={profile.displayName} size={96} />
          <Text style={styles.photoLink}>
            {photoBusy ? t('common.pleaseWait') : t('profile.changePhoto')}
          </Text>
        </Pressable>
        {photoError ? <Text style={commonStyles.error}>{photoError}</Text> : null}
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
      <ActionSheet
        visible={photoSheetOpen}
        title={t('profile.changePhoto')}
        actions={[
          { label: t('profile.choosePhoto'), onPress: () => void changePhoto('choose') },
          ...(profile.photoDataUrl
            ? [
                {
                  label: t('profile.removePhoto'),
                  destructive: true,
                  onPress: () => void changePhoto('remove'),
                } satisfies SheetAction,
              ]
            : []),
        ]}
        onClose={() => setPhotoSheetOpen(false)}
      />
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
  photo: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  photoLink: {
    ...commonStyles.link,
    fontSize: 13,
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
