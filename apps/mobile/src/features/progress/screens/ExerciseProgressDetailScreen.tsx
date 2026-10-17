import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressChart } from '@/features/progress/components/ProgressChart';
import { RecordsCard } from '@/features/progress/components/RecordsCard';
import { TimedProgressDetail } from '@/features/progress/components/TimedProgress';
import { progressClient } from '@/features/progress/api/progressClient';
import { buildProgressSeries } from '@/features/progress/utils/chartData';
import { extractPersonalRecords } from '@/features/progress/utils/personalRecords';
import { useSettings } from '@/features/settings/SettingsContext';
import { formatDate, formatShortDate } from '@/lib/format';
import { isTimedOrDistance } from '@/lib/tracking';
import { formatWeightValue, fromKg, roundWeight } from '@/lib/weight';
import { Chip } from '@/ui/Chip';
import { StatTile } from '@/ui/StatTile';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, fonts, radii, spacing, typeScale } from '@/ui/theme';
import { CardHeader } from '@/ui/CardHeader';
import type { ExerciseProgressDetail, WeightUnit } from '@workout/domain';

function formatValue(value?: number) {
  return value === undefined ? '-' : String(value);
}

/** kg → rounded display-unit number (used for charted/volume values). */
function toDisplay(kg: number, unit: WeightUnit) {
  return roundWeight(fromKg(kg, unit));
}

export function ExerciseProgressDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const [progress, setProgress] = useState<ExerciseProgressDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const { settings } = useSettings();
  const unit = settings.unit;

  const loadProgress = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setProgress(null);
      }

      if (!exerciseId) {
        if (shouldUpdate()) {
          setErrorMessage(t('exercises.missingId'));
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextProgress = await progressClient.getByExerciseId(exerciseId);

        if (shouldUpdate()) {
          setProgress(nextProgress);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : t('progress.notAvailable'),
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [exerciseId, t],
  );

  useEffect(() => {
    let isActive = true;

    void loadProgress(() => isActive);

    return () => {
      isActive = false;
    };
  }, [loadProgress]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StateView kind="loading" message={t('progress.loading')} />
      </View>
    );
  }

  if (!progress) {
    return (
      <View style={styles.screen}>
        <StateView
          kind="empty"
          icon="trending-up-outline"
          message={errorMessage ?? t('progress.notAvailable')}
          actionLabel={t('progress.backToProgress')}
          onAction={() => router.replace('/progress')}
        />
      </View>
    );
  }

  // Timed and distance exercises read in time or distance (spec 0021).
  if (isTimedOrDistance(progress.trackingType)) {
    return <TimedProgressDetail progress={progress} unit={unit} />;
  }

  // Convert the kg-scaled metrics into the user's display unit up front so the
  // charts, records and per-session list all read in the same unit.
  const displayPoints = progress.points.map((point) => ({
    ...point,
    bestWeightKg:
      point.bestWeightKg !== undefined
        ? toDisplay(point.bestWeightKg, unit)
        : point.bestWeightKg,
    totalVolume:
      point.totalVolume !== undefined
        ? toDisplay(point.totalVolume, unit)
        : point.totalVolume,
    estimatedOneRepMax:
      point.estimatedOneRepMax !== undefined
        ? toDisplay(point.estimatedOneRepMax, unit)
        : point.estimatedOneRepMax,
  }));

  // A session without a 1RM or with no volume (reps-only, timed) is a gap in
  // the line, never a zero (spec 0034 EF-7); record sessions keep their flag.
  const oneRepMaxSeries = buildProgressSeries(displayPoints, 'estimatedOneRepMax', {
    positiveOnly: true,
  });
  const volumeSeries = buildProgressSeries(displayPoints, 'totalVolume', {
    positiveOnly: true,
  });
  const personalRecords = extractPersonalRecords(progress.points);
  // Current best of each record type (spec 0023); absent from older servers.
  const records = progress.records ?? [];
  const heaviest = records.find((record) => record.type === 'heaviestWeight');

  const formatAxisDate = (date: string) => formatShortDate(date, i18n.language);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{progress.exerciseName}</Text>
        <View style={styles.headerMeta}>
          <Text style={styles.meta}>{t('progress.sessionsCount', { count: progress.sessionCount })}</Text>
          {progress.isRecordSession ? (
            <Chip icon="trophy" tone="record" size="sm" label={t('progress.recentPrLabel')} />
          ) : null}
        </View>
      </View>
      <View style={styles.tiles}>
        <StatTile
          label={t('progress.latestLabel')}
          value={formatWeightValue(progress.latestWeightKg, unit)}
          unit={unit}
          caption={t('progress.repsCaption', { reps: formatValue(progress.latestReps) })}
        />
        <StatTile
          label={t('progress.bestLabel')}
          value={formatWeightValue(progress.personalBestWeightKg, unit)}
          unit={unit}
          caption={t('progress.repsCaption', {
            reps: formatValue(heaviest ? heaviest.reps : progress.personalBestReps),
          })}
          tone="record"
        />
      </View>
      <View style={styles.tiles}>
        <StatTile
          icon="flash-outline"
          label={t('progress.estimated1rm')}
          value={formatWeightValue(progress.bestEstimatedOneRepMax, unit)}
          unit={unit}
        />
      </View>
      {oneRepMaxSeries.points.length > 0 ? (
        <ProgressChart
          title={t('progress.estimated1rm')}
          unit={unit}
          series={oneRepMaxSeries}
          formatLabel={formatAxisDate}
          formatValue={(value) => String(roundWeight(value))}
        />
      ) : volumeSeries.points.length > 0 ? (
        <ProgressChart
          title={t('progress.volumePerSession')}
          unit={unit}
          series={volumeSeries}
          formatLabel={formatAxisDate}
        />
      ) : null}
      <RecordsCard
        title={t('progress.records.title')}
        unit={unit}
        items={records.map((record, index) => ({
          key: `${record.type}-${index}`,
          record,
          meta: formatDate(record.date, i18n.language),
        }))}
      />
      {personalRecords.length > 0 ? (
        <View style={styles.card}>
          <CardHeader title={t('progress.heaviestOverTime')} />
          {personalRecords
            .slice()
            .reverse()
            .map((record, index) => (
              <View key={`${record.date}-${index}`} style={styles.recordRow}>
                <View style={styles.recordIcon}>
                  <Ionicons name="trophy" size={14} color={colors.accent} />
                </View>
                <Text style={styles.recordValue}>
                  {`${formatWeightValue(record.weightKg, unit)} ${unit}${record.reps !== undefined ? ` × ${record.reps}` : ''}`}
                </Text>
                <Text style={styles.recordDate}>{formatDate(record.date, i18n.language)}</Text>
              </View>
            ))}
        </View>
      ) : null}
      <Text style={styles.sectionLabel}>{t('progress.sessionsLabel')}</Text>
      {displayPoints
        .slice()
        .reverse()
        .map((point, index) => (
          <View key={`${point.date}-${index}`} style={styles.sessionRow}>
            <Text style={styles.sessionDate}>{formatDate(point.date, i18n.language)}</Text>
            <View style={styles.sessionFigures}>
              <Text style={styles.sessionValue}>
                {`${formatValue(point.bestWeightKg)} ${unit} × ${formatValue(point.bestReps)}`}
              </Text>
              <Text style={styles.sessionMeta}>
                {t('progress.sessionMeta', {
                  volume: formatValue(point.totalVolume),
                  oneRepMax: formatValue(point.estimatedOneRepMax),
                  unit,
                })}
              </Text>
            </View>
          </View>
        ))}
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
  header: {
    gap: spacing.xs,
  },
  title: {
    ...commonStyles.title,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  meta: {
    ...commonStyles.meta,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    ...commonStyles.card,
  },
  recordRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.accentSoft,
  },
  recordValue: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
    fontVariant: ['tabular-nums'],
  },
  recordDate: {
    color: colors.textMuted,
    ...typeScale.caption,
  },
  sectionLabel: {
    ...commonStyles.sectionLabel,
    marginTop: spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  sessionDate: {
    width: 96,
    color: colors.textMuted,
    ...typeScale.caption,
  },
  sessionFigures: {
    flex: 1,
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  sessionValue: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
    fontVariant: ['tabular-nums'],
  },
  sessionMeta: {
    color: colors.textSubtle,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
});
