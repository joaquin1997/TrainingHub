import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { profileClient } from '@/features/profile/api/profileClient';
import { UnitInput } from '@/features/profile/components/UnitInput';
import { useProfileData } from '@/features/profile/useProfileData';
import { parseDecimalInput, readRangeError, toInputString } from '@/features/profile/utils/form';
import { useSettings } from '@/features/settings/SettingsContext';
import { cmToFeetInches, feetInchesToCm, formatHeight } from '@/lib/length';
import { Button } from '@/ui/Button';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, createStyles, spacing, typeScale, useTheme } from '@/ui/theme';

const BIO_MAX = 300;

/** Name, bio and height (spec 0027 FR-1). Height is typed in cm, or ft + in. */
export function ProfileEditScreen() {
  useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { settings } = useSettings();
  const imperial = settings.unit === 'lb';
  const { profile, isLoading, error, reload } = useProfileData();

  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  // Fill the form once, from the first profile that arrives.
  useEffect(() => {
    if (!profile || loaded) {
      return;
    }
    setName(profile.displayName);
    setBio(profile.bio ?? '');
    setHeightCm(toInputString(profile.heightCm));
    if (profile.heightCm) {
      const split = cmToFeetInches(profile.heightCm);
      setFeet(String(split.feet));
      setInches(String(split.inches));
    }
    setLoaded(true);
  }, [loaded, profile]);

  /** The height typed, in cm: `null` when blank, `undefined` when invalid. */
  const readHeight = (): number | null | undefined => {
    if (!imperial) {
      return parseDecimalInput(heightCm);
    }
    const ft = parseDecimalInput(feet);
    const inch = parseDecimalInput(inches);
    if (ft === undefined || inch === undefined) {
      return undefined;
    }
    if (ft === null && inch === null) {
      return null;
    }
    return feetInchesToCm(ft ?? 0, inch ?? 0);
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaveError(t('profile.nameRequired'));
      return;
    }
    const height = readHeight();
    if (height === undefined) {
      setSaveError(t('profile.invalidNumber', { name: t('profile.height') }));
      return;
    }

    setIsSaving(true);
    setSaveError(undefined);
    try {
      await profileClient.update({ displayName: trimmedName, bio: bio.trim() || null, heightCm: height });
      router.back();
    } catch (saveFailure) {
      const range = readRangeError(saveFailure);
      setSaveError(
        range
          ? t('profile.outOfRange', {
              name: t('profile.height'),
              min: formatHeight(range.min, settings.unit),
              max: formatHeight(range.max, settings.unit),
            })
          : saveFailure instanceof Error
            ? saveFailure.message
            : t('profile.saveError'),
      );
    } finally {
      setIsSaving(false);
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.field}>
        <Text style={commonStyles.sectionLabel}>{t('profile.displayName')}</Text>
        <TextInput
          keyboardAppearance="dark"
          value={name}
          onChangeText={setName}
          maxLength={50}
          style={commonStyles.input}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={t('profile.displayName')}
        />
      </View>

      <View style={styles.field}>
        <Text style={commonStyles.sectionLabel}>{t('profile.bio')}</Text>
        <TextInput
          keyboardAppearance="dark"
          value={bio}
          onChangeText={setBio}
          maxLength={BIO_MAX}
          multiline
          placeholder={t('profile.bioPlaceholder')}
          placeholderTextColor={colors.textSubtle}
          style={[commonStyles.input, styles.bio]}
          accessibilityLabel={t('profile.bio')}
        />
        <Text style={styles.counter}>{`${bio.length}/${BIO_MAX}`}</Text>
      </View>

      <View style={styles.field}>
        <Text style={commonStyles.sectionLabel}>{t('profile.height')}</Text>
        {imperial ? (
          <View style={styles.row}>
            <UnitInput value={feet} onChangeText={setFeet} unit="ft" label={t('profile.height')} />
            <UnitInput value={inches} onChangeText={setInches} unit="in" label={t('profile.height')} />
          </View>
        ) : (
          <UnitInput value={heightCm} onChangeText={setHeightCm} unit="cm" label={t('profile.height')} />
        )}
      </View>

      {saveError ? <Text style={commonStyles.error}>{saveError}</Text> : null}

      <Button
        label={isSaving ? t('common.pleaseWait') : t('common.save')}
        icon="checkmark"
        onPress={() => void save()}
        disabled={isSaving}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = createStyles(() => ({
  screen: {
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  field: {
    gap: spacing.sm,
  },
  bio: {
    minHeight: 96,
    maxHeight: 160,
    textAlignVertical: 'top',
  },
  counter: {
    ...commonStyles.meta,
    alignSelf: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
}));
