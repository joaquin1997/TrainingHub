import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BodyMeasurementKey } from '@workout/domain';

import { measurementsClient } from '@/features/profile/api/measurementsClient';
import { UnitInput } from '@/features/profile/components/UnitInput';
import { useProfileData } from '@/features/profile/useProfileData';
import {
  combineDayAndTime,
  isSameLocalDay,
  shiftDay,
  startOfLocalDay,
} from '@/features/profile/utils/entryDate';
import {
  entryToTexts,
  readRangeError,
  textsToValues,
  type EntryFormTexts,
} from '@/features/profile/utils/form';
import {
  displayUnitOf,
  formatMeasurement,
  isMeasurementKey,
  MEASUREMENT_KINDS,
} from '@/features/profile/utils/measurements';
import { useSettings } from '@/features/settings/SettingsContext';
import { confirmAction } from '@/lib/confirmAction';
import { formatDayHeading } from '@/lib/format';
import { Button } from '@/ui/Button';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';

const COMPOSITION = MEASUREMENT_KINDS.filter((kind) => kind.dimension !== 'length');
const CIRCUMFERENCES = MEASUREMENT_KINDS.filter((kind) => kind.dimension === 'length');

/**
 * Adds a measurement entry for a day (today by default) with any subset of
 * the measurements, or edits / deletes one (`?entryId=`) (spec 0027 FR-2).
 */
export function MeasurementEntryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const { settings } = useSettings();
  const unit = settings.unit;
  const { entries, isLoading, error, reload } = useProfileData({ withMeasurements: true });
  const original = useMemo(
    () => (entryId ? entries.find((entry) => entry.id === entryId) : undefined),
    [entries, entryId],
  );

  const [ready, setReady] = useState(!entryId);
  const [day, setDay] = useState(() => startOfLocalDay(new Date()));
  const [time, setTime] = useState(() => new Date());
  const [texts, setTexts] = useState<EntryFormTexts>(() => entryToTexts(undefined, unit));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  // When editing, fill the form once from the stored entry.
  useEffect(() => {
    if (ready || !original) {
      return;
    }
    const measuredAt = new Date(original.measuredAt);
    setDay(startOfLocalDay(measuredAt));
    setTime(measuredAt);
    setTexts(entryToTexts(original, unit));
    setReady(true);
  }, [original, ready, unit]);

  const label = (key: BodyMeasurementKey) => t(`profile.kinds.${key}`);
  const isToday = isSameLocalDay(day, new Date());

  const save = async () => {
    const result = textsToValues(texts, original, unit);
    if (!result.ok) {
      setSaveError(t('profile.invalidNumber', { name: label(result.invalid) }));
      return;
    }
    if (result.count === 0) {
      setSaveError(t('profile.entryEmpty'));
      return;
    }

    const input = { measuredAt: combineDayAndTime(day, time), ...result.values };
    setIsSaving(true);
    setSaveError(undefined);
    try {
      if (original) {
        await measurementsClient.update(original.id, input);
      } else {
        await measurementsClient.create(input);
      }
      router.back();
    } catch (saveFailure) {
      const range = readRangeError(saveFailure);
      setSaveError(
        range && isMeasurementKey(range.field)
          ? t('profile.outOfRange', {
              name: label(range.field),
              min: formatMeasurement(range.field, range.min, unit),
              max: formatMeasurement(range.field, range.max, unit),
            })
          : saveFailure instanceof Error
            ? saveFailure.message
            : t('profile.measurementSaveError'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!original) {
      return;
    }
    const confirmed = await confirmAction({
      title: t('profile.deleteEntryTitle'),
      message: t('profile.deleteEntryMessage'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await measurementsClient.remove(original.id);
      router.back();
    } catch (deleteFailure) {
      setSaveError(deleteFailure instanceof Error ? deleteFailure.message : t('profile.measurementSaveError'));
    }
  };

  if (!ready) {
    return (
      <View style={commonStyles.fixedContent}>
        {isLoading ? (
          <StateView kind="loading" message={t('common.loading')} />
        ) : (
          <StateView
            kind="error"
            message={error ?? t('profile.entryNotFound')}
            actionLabel={t('common.retry')}
            onAction={() => void reload()}
          />
        )}
      </View>
    );
  }

  const renderFields = (kinds: typeof MEASUREMENT_KINDS) =>
    kinds.map(({ key }) => (
      <View key={key} style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{label(key)}</Text>
        <View style={styles.fieldInput}>
          <UnitInput
            value={texts[key]}
            onChangeText={(text) => setTexts((current) => ({ ...current, [key]: text }))}
            unit={displayUnitOf(key, unit)}
            label={label(key)}
          />
        </View>
      </View>
    ));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.previousDay')}
          onPress={() => setDay((current) => shiftDay(current, -1))}
          hitSlop={6}
          style={({ pressed }) => [styles.dayButton, pressed ? commonStyles.pressed : null]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.dateText}>
          <Text style={commonStyles.sectionLabel}>{t('profile.date')}</Text>
          <Text style={commonStyles.label}>
            {isToday ? t('profile.today') : formatDayHeading(day.toISOString(), i18n.language)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.nextDay')}
          accessibilityState={{ disabled: isToday }}
          disabled={isToday}
          onPress={() => setDay((current) => shiftDay(current, 1))}
          hitSlop={6}
          style={({ pressed }) => [
            styles.dayButton,
            isToday ? commonStyles.disabled : null,
            pressed ? commonStyles.pressed : null,
          ]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={commonStyles.cardTitle}>{t('profile.composition')}</Text>
        {renderFields(COMPOSITION)}
      </View>

      <View style={styles.section}>
        <Text style={commonStyles.cardTitle}>{t('profile.circumferences')}</Text>
        {renderFields(CIRCUMFERENCES)}
      </View>

      <Text style={styles.hint}>{t('profile.entryHint')}</Text>
      {saveError ? <Text style={commonStyles.error}>{saveError}</Text> : null}

      <Button
        label={isSaving ? t('common.pleaseWait') : t('common.save')}
        icon="checkmark"
        onPress={() => void save()}
        disabled={isSaving}
        fullWidth
      />
      {original ? (
        <Button
          label={t('profile.deleteEntry')}
          icon="trash-outline"
          variant="ghost"
          destructive
          onPress={() => void remove()}
          fullWidth
        />
      ) : null}
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
  dateRow: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateText: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  section: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fieldLabel: {
    ...commonStyles.label,
    flex: 1,
  },
  fieldInput: {
    width: 150,
    flexDirection: 'row',
  },
  hint: {
    ...commonStyles.meta,
    fontSize: 13,
  },
});
