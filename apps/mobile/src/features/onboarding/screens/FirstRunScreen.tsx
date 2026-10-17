import { Ionicons } from '@expo/vector-icons';
import { getLocales } from 'expo-localization';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FIRST_RUN_REST_OPTIONS,
  languageToSave,
  preselectedUnit,
} from '@/features/onboarding/firstRunRules';
import { useFirstRunCompletion } from '@/features/onboarding/useFirstRunGate';
import { useSettings } from '@/features/settings/SettingsContext';
import {
  restAlertsForThisDevice,
  type RestAlertPermission,
} from '@/features/workouts/restTimer/restAlerts';
import { getDeviceLanguage } from '@/i18n/device';
import i18n from '@/i18n';
import { deviceKeys, deviceStore } from '@/lib/deviceStore';
import { formatDuration } from '@/lib/format';
import { BrandMark } from '@/ui/BrandMark';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { colors, commonStyles, createStyles, radii, spacing, typeScale, useTheme } from '@/ui/theme';
import type { AppLanguage, WeightUnit } from '@workout/domain';

const STEPS = 3;
const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];
const UNITS: WeightUnit[] = ['kg', 'lb'];

/**
 * The first run (spec 0037 FR-5 – FR-13): language and units, rest and rest
 * alerts, ready. Nothing is saved until the last action (FR-13); Skip, from
 * any screen, saves nothing (FR-12). Only the system permission is answered
 * when asked, as it belongs to the device.
 */
export function FirstRunScreen() {
  useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, save } = useSettings();
  const { complete } = useFirstRunCompletion();
  const deviceLanguage = useMemo(() => getDeviceLanguage(), []);
  const alerts = useMemo(() => restAlertsForThisDevice(), []);

  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<AppLanguage>(deviceLanguage);
  const [unit, setUnit] = useState<WeightUnit>(() =>
    preselectedUnit(getLocales()[0]?.measurementSystem),
  );
  const [rest, setRest] = useState(90);
  const [permission, setPermission] = useState<RestAlertPermission>('unknown');
  // The alert question only where the device can alert and was never asked (FR-8).
  const [asksAlerts, setAsksAlerts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    if (!alerts.outsideApp) {
      return;
    }
    void alerts.permissionStatus().then((status) => {
      setPermission(status);
      setAsksAlerts(status === 'notAsked');
    });
  }, [alerts]);

  // The account's own language, for every way out that saves nothing (EF-3, EF-4).
  const accountLanguage = settings.language ?? deviceLanguage;
  useEffect(
    () => () => {
      if (!finished.current) {
        void i18n.changeLanguage(accountLanguage);
      }
    },
    [accountLanguage],
  );

  const chooseLanguage = (next: AppLanguage) => {
    setLanguage(next);
    // The first run's own text follows at once (FR-6).
    void i18n.changeLanguage(next);
  };

  const allowAlerts = async () => {
    await alerts.requestPermission().catch(() => false);
    setPermission(await alerts.permissionStatus());
  };

  const notNow = async () => {
    await deviceStore.set(deviceKeys.restAlertsNotNow, '1');
    setPermission('notAsked');
    setAsksAlerts(false);
  };

  const leave = (toProfile: boolean) => {
    router.replace('/routines');
    if (toProfile) {
      router.push('/settings/profile-edit');
    }
  };

  const skip = async () => {
    void i18n.changeLanguage(accountLanguage);
    finished.current = true;
    await complete();
    leave(false);
  };

  const finish = async (toProfile: boolean) => {
    setIsSaving(true);
    setSaveFailed(false);
    try {
      const chosenLanguage = languageToSave(language, deviceLanguage);
      await save({
        unit,
        defaultRestSeconds: rest,
        ...(chosenLanguage ? { language: chosenLanguage } : {}),
      });
      finished.current = true;
      await complete();
      leave(toProfile);
    } catch {
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  const alertAnswered = asksAlerts && permission !== 'notAsked';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.topBar}>
        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('firstRun.back')}
            onPress={() => setStep(step - 1)}
            hitSlop={8}
            style={styles.topAction}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.topAction} />
        )}
        <View style={styles.dots} accessibilityLabel={t('firstRun.stepOf', { step: step + 1, count: STEPS })}>
          {Array.from({ length: STEPS }, (_, index) => (
            <View key={index} style={[styles.dot, index === step ? styles.dotOn : null]} />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void skip()}
          hitSlop={8}
          style={[styles.topAction, styles.topActionEnd]}
        >
          <Text style={styles.skip}>{t('firstRun.skip')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 ? (
          <>
            <BrandMark size={56} />
            <Text accessibilityRole="header" style={styles.title}>
              {t('firstRun.welcomeTitle')}
            </Text>
            <Text style={styles.body}>{t('firstRun.welcomeBody')}</Text>
            <Text style={styles.label}>{t('settings.language')}</Text>
            <View style={styles.options}>
              {LANGUAGES.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={language === option.value}
                  onPress={() => chooseLanguage(option.value)}
                />
              ))}
            </View>
            <Text style={styles.label}>{t('settings.weightUnit')}</Text>
            <View style={styles.options}>
              {UNITS.map((option) => (
                <Chip key={option} label={option} selected={unit === option} onPress={() => setUnit(option)} />
              ))}
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {t('firstRun.restTitle')}
            </Text>
            <Text style={styles.body}>{t('firstRun.restBody')}</Text>
            <View style={styles.options}>
              {FIRST_RUN_REST_OPTIONS.map((seconds) => (
                <Chip
                  key={seconds}
                  label={formatDuration(seconds)}
                  selected={rest === seconds}
                  onPress={() => setRest(seconds)}
                />
              ))}
            </View>
            {asksAlerts ? (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                  <Text style={styles.alertTitle}>{t('firstRun.alertsTitle')}</Text>
                </View>
                <Text style={styles.body}>{t('firstRun.alertsBody')}</Text>
                {alertAnswered ? (
                  <Text style={styles.body}>
                    {permission === 'granted' ? t('firstRun.alertsOn') : t('firstRun.alertsOff')}
                  </Text>
                ) : (
                  <View style={styles.alertActions}>
                    <Button label={t('firstRun.allowAlerts')} icon="notifications" onPress={() => void allowAlerts()} />
                    <Button label={t('firstRun.notNow')} variant="ghost" onPress={() => void notNow()} />
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <BrandMark size={56} />
            <Text accessibilityRole="header" style={styles.title}>
              {t('firstRun.readyTitle')}
            </Text>
            <Text style={styles.body}>{t('firstRun.readyBody')}</Text>
            <Button
              label={t('firstRun.addProfile')}
              icon="person-circle-outline"
              variant="secondary"
              onPress={() => void finish(true)}
              disabled={isSaving}
            />
            {saveFailed ? <Text style={styles.error}>{t('firstRun.saveError')}</Text> : null}
          </>
        ) : null}
      </ScrollView>

      <Button
        label={
          step < STEPS - 1
            ? t('firstRun.continue')
            : saveFailed
              ? t('common.retry')
              : t('firstRun.start')
        }
        onPress={() => (step < STEPS - 1 ? setStep(step + 1) : void finish(false))}
        disabled={isSaving}
        fullWidth
      />
    </View>
  );
}

const styles = createStyles(() => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topAction: {
    flex: 1,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  topActionEnd: {
    alignItems: 'flex-end',
  },
  skip: {
    ...typeScale.body,
    color: colors.textMuted,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.round,
    backgroundColor: colors.borderStrong,
  },
  dotOn: {
    width: 20,
    backgroundColor: colors.primary,
  },
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  title: {
    ...commonStyles.title,
  },
  body: {
    ...commonStyles.body,
  },
  label: {
    ...commonStyles.sectionLabel,
    marginTop: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  alertCard: {
    ...commonStyles.card,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alertTitle: {
    ...commonStyles.cardTitle,
  },
  alertActions: {
    gap: spacing.xs,
  },
  error: {
    ...typeScale.caption,
    color: colors.danger,
  },
}));
