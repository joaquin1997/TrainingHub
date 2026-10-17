import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressChart } from '@/features/progress/components/ProgressChart';
import { scaleSeries } from '@/features/progress/utils/chartData';
import { useProfileData } from '@/features/profile/useProfileData';
import {
  changesOf,
  displayUnitOf,
  formatChange,
  formatMeasurement,
  historyOf,
  isMeasurementKey,
  toDisplayValue,
} from '@/features/profile/utils/measurements';
import { useSettings } from '@/features/settings/SettingsContext';
import { formatDate, formatShortDate, formatTime } from '@/lib/format';
import { StatTile } from '@/ui/StatTile';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, spacing } from '@/ui/theme';

/** Bars shown at most; a weekly weigh-in fills about four months. */
const MAX_BARS = 16;

/**
 * One measurement over time: latest value, change since the previous and the
 * first entry, trend chart and every entry (spec 0027 FR-3).
 */
export function MeasurementHistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const { settings } = useSettings();
  const unit = settings.unit;
  const { entries, isLoading, error, reload } = useProfileData({ withMeasurements: true });

  if (!isMeasurementKey(kind)) {
    return (
      <View style={commonStyles.fixedContent}>
        <StateView kind="error" message={t('profile.unknownMeasurement')} />
      </View>
    );
  }

  const label = t(`profile.kinds.${kind}`);
  const points = historyOf(entries, kind);
  const latest = points[points.length - 1];
  const changes = changesOf(points);
  const series = scaleSeries(
    points.map((point) => ({ date: point.measuredAt, value: toDisplayValue(kind, point.value, unit) })),
    MAX_BARS,
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: label }} />

      {!latest ? (
        isLoading ? (
          <StateView kind="loading" message={t('common.loading')} />
        ) : error ? (
          <StateView kind="error" message={error} actionLabel={t('common.retry')} onAction={() => void reload()} />
        ) : (
          <StateView kind="empty" icon="body-outline" title={t('profile.historyEmpty')} />
        )
      ) : (
        <>
          <View style={styles.latest}>
            <Text style={commonStyles.sectionLabel}>{t('profile.latest')}</Text>
            <Text style={commonStyles.figureLarge}>{formatMeasurement(kind, latest.value, unit)}</Text>
            <Text style={commonStyles.meta}>{formatDate(latest.measuredAt, i18n.language)}</Text>
          </View>

          {/* A single entry shows its value only: no change, no chart (EF-4). */}
          {changes ? (
            <View style={styles.tiles}>
              <StatTile label={t('profile.sincePrevious')} value={formatChange(kind, changes.sincePrevious, unit)} />
              <StatTile label={t('profile.sinceFirst')} value={formatChange(kind, changes.sinceFirst, unit)} />
            </View>
          ) : null}

          {points.length > 1 ? (
            <ProgressChart
              title={t('profile.trend')}
              unit={displayUnitOf(kind, unit)}
              series={series}
              formatLabel={(date) => formatShortDate(date, i18n.language)}
              formatValue={(value) => String(Math.round(value * 10) / 10)}
            />
          ) : null}

          <View style={styles.list}>
            <Text style={commonStyles.cardTitle}>{t('profile.entries')}</Text>
            {[...points].reverse().map((point) => (
              <Pressable
                key={point.entryId}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/settings/measurement', params: { entryId: point.entryId } })
                }
                style={({ pressed }) => [styles.row, pressed ? commonStyles.pressed : null]}
              >
                <View style={styles.rowDate}>
                  <Text style={commonStyles.label}>{formatDate(point.measuredAt, i18n.language)}</Text>
                  <Text style={styles.rowTime}>{formatTime(point.measuredAt, i18n.language)}</Text>
                </View>
                <Text style={commonStyles.label}>{formatMeasurement(kind, point.value, unit)}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </>
      )}
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
  latest: {
    ...commonStyles.card,
    gap: spacing.xs,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  list: {
    ...commonStyles.card,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowDate: {
    flex: 1,
  },
  rowTime: {
    color: colors.textSubtle,
    fontSize: 12,
  },
});
