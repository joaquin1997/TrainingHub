import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import type {
  ExerciseProgressDetail,
  ExerciseProgressSummary,
  ExerciseTrackingType,
  WeightUnit,
} from '@workout/domain';

import { ProgressChart } from '@/features/progress/components/ProgressChart';
import { RecordsCard } from '@/features/progress/components/RecordsCard';
import { buildProgressSeries } from '@/features/progress/utils/chartData';
import { formatDate, formatDuration, formatShortDate } from '@/lib/format';
import { formatDistance, formatSetValues } from '@/lib/tracking';
import { Chip } from '@/ui/Chip';
import { StatTile } from '@/ui/StatTile';
import { colors, commonStyles, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';

/**
 * Progress of a timed or distance exercise (spec 0021): its record is the
 * longest time, or the longest distance (FR-6), never a weight or a volume.
 */
const isDistance = (type?: ExerciseTrackingType) => type === 'distance_duration';

const formatMetric = (type: ExerciseTrackingType | undefined, value?: number) =>
  value === undefined ? '–' : isDistance(type) ? formatDistance(value) : formatDuration(value);

/** Latest and best figures for a progress overview card. */
export function TimedProgressFigures({ summary }: { summary: ExerciseProgressSummary }) {
  useTheme();
  const { t } = useTranslation();
  const distance = isDistance(summary.trackingType);

  return (
    <View style={styles.figures}>
      <View style={styles.figure}>
        <Text style={styles.figureLabel} numberOfLines={1}>
          {t('progress.latestLabel')}
        </Text>
        <Text style={styles.figureValue}>
          {formatMetric(
            summary.trackingType,
            distance ? summary.latestDistanceMeters : summary.latestDurationSeconds,
          )}
        </Text>
      </View>
      <View style={styles.figure}>
        <Text style={styles.figureLabel} numberOfLines={1}>
          {distance ? t('progress.longestDistance') : t('progress.longestTime')}
        </Text>
        <Text style={styles.figureValue}>
          {formatMetric(
            summary.trackingType,
            distance ? summary.personalBestDistanceMeters : summary.personalBestDurationSeconds,
          )}
        </Text>
      </View>
    </View>
  );
}

/** The exercise progress screen's body for a timed or distance exercise. */
export function TimedProgressDetail({
  progress,
  unit,
}: {
  progress: ExerciseProgressDetail;
  unit: WeightUnit;
}) {
  useTheme();
  const { t, i18n } = useTranslation();
  const distance = isDistance(progress.trackingType);
  const metric = distance ? 'bestDistanceMeters' : 'bestDurationSeconds';
  const series = buildProgressSeries(progress.points, metric);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{progress.exerciseName}</Text>
        <View style={styles.headerMeta}>
          <Text style={styles.meta}>
            {t('progress.sessionsCount', { count: progress.sessionCount })}
          </Text>
          {progress.isRecordSession ? (
            <Chip icon="trophy" tone="record" size="sm" label={t('progress.recentPrLabel')} />
          ) : null}
        </View>
      </View>
      <View style={styles.tiles}>
        <StatTile
          label={t('progress.latestLabel')}
          value={formatMetric(
            progress.trackingType,
            distance ? progress.latestDistanceMeters : progress.latestDurationSeconds,
          )}
        />
        <StatTile
          label={distance ? t('progress.longestDistance') : t('progress.longestTime')}
          value={formatMetric(
            progress.trackingType,
            distance ? progress.personalBestDistanceMeters : progress.personalBestDurationSeconds,
          )}
          tone="record"
        />
      </View>
      {series.points.length > 0 ? (
        <ProgressChart
          title={distance ? t('progress.longestDistance') : t('progress.longestTime')}
          unit={distance ? 'm' : 's'}
          series={series}
          formatLabel={(date) => formatShortDate(date, i18n.language)}
        />
      ) : null}
      <RecordsCard
        title={t('progress.records.title')}
        unit={unit}
        items={(progress.records ?? []).map((record, index) => ({
          key: `${record.type}-${index}`,
          record,
          meta: formatDate(record.date, i18n.language),
        }))}
      />
      <Text style={styles.sectionLabel}>{t('progress.sessionsLabel')}</Text>
      {progress.points
        .slice()
        .reverse()
        .map((point, index) => (
          <View key={`${point.date}-${index}`} style={styles.sessionRow}>
            <Text style={styles.sessionDate}>{formatDate(point.date, i18n.language)}</Text>
            <Text style={styles.sessionValue}>
              {formatSetValues(
                {
                  weightKg: point.bestWeightKg,
                  durationSeconds: point.bestDurationSeconds,
                  distanceMeters: point.bestDistanceMeters,
                },
                unit,
              )}
            </Text>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = createStyles(() => ({
  figures: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  figure: {
    flex: 1,
    gap: spacing.xxs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.sm,
  },
  figureLabel: {
    ...commonStyles.sectionLabel,
  },
  figureValue: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
    fontVariant: ['tabular-nums'],
  },
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
  sectionLabel: {
    ...commonStyles.sectionLabel,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  sessionDate: {
    color: colors.textMuted,
    ...typeScale.caption,
  },
  sessionValue: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
    fontVariant: ['tabular-nums'],
  },
}));
