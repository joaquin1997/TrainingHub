import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { useSettings } from '@/features/settings/SettingsContext';
import {
  clearActiveWorkout,
  hasActiveWorkout,
} from '@/features/workouts/state/workoutDraftStore';
import { confirmAction } from '@/lib/confirmAction';
import { formatDuration } from '@/lib/format';
import { Button } from '@/ui/Button';
import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';
import { ScreenTitle } from '@/ui/ScreenTitle';
import type { AppLanguage, WeightUnit } from '@workout/domain';

const UNITS: WeightUnit[] = ['kg', 'lb'];

type LanguageOption = { value: AppLanguage | null; label: string };

export function SettingsScreen() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  const { user, signOut } = useAuth();

  // An explicit log-out ends the workout in progress, after asking (spec 0010
  // FR-5); an expired session does not (FR-7).
  const handleLogOut = async () => {
    if (hasActiveWorkout()) {
      const confirmed = await confirmAction({
        title: t('settings.logOutActiveTitle'),
        message: t('settings.logOutActiveMessage'),
        confirmLabel: t('settings.logOut'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
      clearActiveWorkout();
    }

    await signOut();
  };

  const changeRest = (delta: number) =>
    update({
      defaultRestSeconds: Math.max(15, settings.defaultRestSeconds + delta),
    });

  const languageOptions: LanguageOption[] = [
    { value: null, label: t('settings.languageSystem') },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <ScreenTitle title={t('nav.settings')} />
      <View style={styles.section}>
        <SectionHeader icon="language-outline" title={t('settings.language')} />
        <Segmented
          options={languageOptions.map((option) => ({
            key: option.label,
            label: option.label,
            selected: settings.language === option.value,
            onPress: () => update({ language: option.value }),
          }))}
        />
        <Text style={styles.hint}>{t('settings.languageHint')}</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader icon="barbell-outline" title={t('settings.weightUnit')} />
        <Segmented
          options={UNITS.map((unit) => ({
            key: unit,
            label: unit,
            selected: settings.unit === unit,
            onPress: () => update({ unit }),
          }))}
        />
        <Text style={styles.hint}>{t('settings.unitHint')}</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader icon="timer-outline" title={t('settings.defaultRestTimer')} />
        <View style={styles.stepperRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="−15 s"
            onPress={() => changeRest(-15)}
            hitSlop={6}
            style={({ pressed }) => [styles.stepButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="remove" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.restValue}>{formatDuration(settings.defaultRestSeconds)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="+15 s"
            onPress={() => changeRest(15)}
            hitSlop={6}
            style={({ pressed }) => [styles.stepButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </Pressable>
        </View>
        <Text style={styles.hint}>{t('settings.restHint')}</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader icon="person-circle-outline" title={t('settings.account')} />
        {user?.email ? (
          <View style={styles.emailRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
            <Text style={styles.email}>{user.email}</Text>
          </View>
        ) : null}
        <Button
          label={t('settings.logOut')}
          icon="log-out-outline"
          variant="danger"
          onPress={() => void handleLogOut()}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/** One row of mutually exclusive options; the selected one is lime (FR-1). */
function Segmented({
  options,
}: {
  options: Array<{ key: string; label: string; selected: boolean; onPress: () => void }>;
}) {
  return (
    <View style={styles.segment}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          accessibilityRole="button"
          accessibilityState={{ selected: option.selected }}
          onPress={option.onPress}
          style={[styles.segmentItem, option.selected ? styles.segmentItemActive : null]}
        >
          <Text
            style={[styles.segmentText, option.selected ? styles.segmentTextActive : null]}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
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
  pressed: {
    ...commonStyles.pressed,
  },
  section: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  sectionTitle: {
    ...commonStyles.cardTitle,
    flexShrink: 1,
  },
  segment: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
  },
  segmentItemActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  segmentTextActive: {
    color: colors.onPrimary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    padding: spacing.sm,
  },
  stepButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  restValue: {
    ...commonStyles.figureLarge,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  email: {
    color: colors.text,
    fontSize: 15,
    flexShrink: 1,
  },
});
