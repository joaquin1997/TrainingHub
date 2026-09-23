import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { formatDuration } from '@/lib/format';
import { Button } from '@/ui/Button';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import type { AppLanguage, WeightUnit } from '@workout/domain';

const UNITS: WeightUnit[] = ['kg', 'lb'];

type LanguageOption = { value: AppLanguage | null; label: string };

export function SettingsScreen() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  const { user, signOut } = useAuth();

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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.segment}>
          {languageOptions.map((option) => {
            const active = settings.language === option.value;
            return (
              <Pressable
                key={option.label}
                onPress={() => update({ language: option.value })}
                style={[styles.segmentItem, active ? styles.segmentItemActive : null]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    active ? styles.segmentTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{t('settings.languageHint')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.weightUnit')}</Text>
        <View style={styles.segment}>
          {UNITS.map((unit) => {
            const active = settings.unit === unit;
            return (
              <Pressable
                key={unit}
                onPress={() => update({ unit })}
                style={[styles.segmentItem, active ? styles.segmentItemActive : null]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    active ? styles.segmentTextActive : null,
                  ]}
                >
                  {unit.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{t('settings.unitHint')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.defaultRestTimer')}</Text>
        <View style={styles.stepperRow}>
          <Pressable
            onPress={() => changeRest(-15)}
            hitSlop={6}
            style={styles.stepButton}
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.restValue}>
            {formatDuration(settings.defaultRestSeconds)}
          </Text>
          <Pressable
            onPress={() => changeRest(15)}
            hitSlop={6}
            style={styles.stepButton}
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>{t('settings.restHint')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
        {user?.email ? <Text style={styles.hint}>{user.email}</Text> : null}
        <Button
          label={t('settings.logOut')}
          variant="danger"
          onPress={() => void signOut()}
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
  section: {
    ...commonStyles.card,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  segmentItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.onPrimary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  stepButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  stepText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  restValue: {
    minWidth: 64,
    textAlign: 'center',
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
