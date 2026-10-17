import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BodyMeasurementEntry, BodyMeasurementKey, WeightUnit } from '@workout/domain';

import { profileClient } from '@/features/profile/api/profileClient';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { pickProfilePhoto } from '@/features/profile/photo/pickProfilePhoto';
import { useProfileData } from '@/features/profile/useProfileData';
import {
  bmiBand,
  bodyMassIndex,
  formatMeasurement,
  latestByKind,
  MEASUREMENT_KINDS,
  waistToHeight,
} from '@/features/profile/utils/measurements';
import { useSettings } from '@/features/settings/SettingsContext';
import { formatDate } from '@/lib/format';
import { formatHeight } from '@/lib/length';
import { ActionSheet, type SheetAction } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { StatTile } from '@/ui/StatTile';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, spacing, typeScale } from '@/ui/theme';
import { ListRow } from '@/ui/ListRow';

/** The person's profile (spec 0027), reached from the Settings account card. */
export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { settings } = useSettings();
  const unit = settings.unit;
  const { profile, setProfile, entries, isLoading, error, reload } = useProfileData({
    withMeasurements: true,
  });
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

      <BodySection
        entries={entries}
        heightCm={profile.heightCm}
        unit={unit}
        locale={i18n.language}
        onAdd={() => router.push('/settings/measurement')}
        onOpen={(key) => router.push(`/settings/measurements/${key}`)}
      />
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

/** Derived figures and the latest value of each measurement (FR-4 to FR-6). */
function BodySection({
  entries,
  heightCm,
  unit,
  locale,
  onAdd,
  onOpen,
}: {
  entries: BodyMeasurementEntry[];
  heightCm: number | null;
  unit: WeightUnit;
  locale: string;
  onAdd: () => void;
  onOpen: (key: BodyMeasurementKey) => void;
}) {
  const { t } = useTranslation();
  const latest = latestByKind(entries);
  // Derived figures need both values; neither is shown otherwise (AC-4).
  const bmi = bodyMassIndex(latest.weightKg?.value, heightCm);
  const ratio = waistToHeight(latest.waistCm?.value, heightCm);
  const measured = MEASUREMENT_KINDS.filter(({ key }) => latest[key]);
  const needsHeight = !heightCm && (latest.weightKg || latest.waistCm);

  return (
    <View style={styles.section}>
      <Text style={commonStyles.cardTitle}>{t('profile.body')}</Text>

      {bmi !== null || ratio !== null ? (
        <View style={styles.tiles}>
          {bmi !== null ? (
            <StatTile label={t('profile.bmi')} value={bmi.toFixed(1)} caption={t(`profile.bmiBands.${bmiBand(bmi)}`)} />
          ) : null}
          {ratio !== null ? (
            <StatTile label={t('profile.waistToHeight')} value={ratio.toFixed(2)} />
          ) : null}
        </View>
      ) : null}
      {bmi !== null ? <Text style={styles.note}>{t('profile.bmiNote')}</Text> : null}
      {needsHeight ? <Text style={styles.note}>{t('profile.derivedNeedsHeight')}</Text> : null}

      {measured.length === 0 ? (
        <Text style={commonStyles.meta}>{t('profile.noMeasurements')}</Text>
      ) : (
        <View>
          {measured.map(({ key }) => {
            const point = latest[key]!;
            return (
              <ListRow
                key={key}
                divider
                title={t(`profile.kinds.${key}`)}
                trailing={
                  <View style={styles.latestValue}>
                    <Text style={commonStyles.label}>{formatMeasurement(key, point.value, unit)}</Text>
                    <Text style={styles.latestDate}>{formatDate(point.measuredAt, locale)}</Text>
                  </View>
                }
                chevron
                onPress={() => onOpen(key)}
              />
            );
          })}
        </View>
      )}

      <Button label={t('profile.addMeasurement')} icon="add" onPress={onAdd} fullWidth />
    </View>
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
    ...typeScale.caption,
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
  section: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  note: {
    ...commonStyles.meta,
  },
  latestValue: {
    alignItems: 'flex-end',
  },
  latestDate: {
    color: colors.textSubtle,
    ...typeScale.caption,
  },
  factLabel: {
    ...commonStyles.meta,
  },
  factValue: {
    ...commonStyles.label,
  },
});
