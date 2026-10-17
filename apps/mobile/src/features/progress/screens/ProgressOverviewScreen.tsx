import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FrequencySummary } from '@/features/progress/components/FrequencySummary';
import { LatestRecordCard } from '@/features/progress/components/LatestRecordCard';
import { WeekSummaryCard } from '@/features/progress/components/WeekSummaryCard';
import { MuscleDistribution } from '@/features/progress/components/MuscleDistribution';
import { ProgressChart } from '@/features/progress/components/ProgressChart';
import { progressClient } from '@/features/progress/api/progressClient';
import { buildWeeklyVolumeSeries } from '@/features/progress/utils/chartData';
import { summarizeTrainingFrequency } from '@/features/progress/utils/trainingFrequency';
import { latestRecord, weekVolumeComparison } from '@/features/progress/utils/weekComparison';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { useSettings } from '@/features/settings/SettingsContext';
import { formatShortDate } from '@/lib/format';
import { TimedProgressFigures } from '@/features/progress/components/TimedProgress';
import { isTimedOrDistance } from '@/lib/tracking';
import { formatWeightValue, fromKg, roundWeight } from '@/lib/weight';
import { useRefresh } from '@/lib/useRefresh';
import { weekStreak } from '@/lib/week';
import { CardHeader } from '@/ui/CardHeader';
import { Chip } from '@/ui/Chip';
import { ScreenTitle } from '@/ui/ScreenTitle';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, fonts, radii, spacing, typeScale } from '@/ui/theme';
import { SkeletonProgress } from '@/ui/Skeleton';
import type {
  ExerciseProgressSummary,
  MuscleGroupVolumePoint,
  SessionRecords,
  WeeklyVolumePoint,
  WorkoutSession,
} from '@workout/domain';

function formatValue(value?: number) {
  return value === undefined ? '-' : String(value);
}

export function ProgressOverviewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [progress, setProgress] = useState<ExerciseProgressSummary[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumePoint[]>([]);
  const [muscleVolume, setMuscleVolume] = useState<MuscleGroupVolumePoint[]>([]);
  // The week summary and latest record (spec 0035 FR-11); null when they could
  // not be loaded, which hides them (EF-3).
  const [sessions, setSessions] = useState<WorkoutSession[] | null>(null);
  const [sessionRecords, setSessionRecords] = useState<SessionRecords[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const { settings } = useSettings();
  const unit = settings.unit;

  const loadProgress = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const [nextProgress, nextWeeklyVolume, nextMuscleVolume, nextSessions, nextRecords] =
          await Promise.all([
            progressClient.list(),
            progressClient.weeklyVolume(),
            progressClient.muscleDistribution(),
            workoutsClient.list().catch(() => null),
            progressClient.sessionRecords().catch(() => null),
          ]);

        if (shouldUpdate()) {
          setProgress(nextProgress);
          setWeeklyVolume(nextWeeklyVolume);
          setMuscleVolume(nextMuscleVolume);
          setSessions(nextSessions);
          setSessionRecords(nextRecords);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : t('progress.loadError'),
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void loadProgress(() => isActive);

      return () => {
        isActive = false;
      };
    }, [loadProgress]),
  );

  const { isRefreshing, onRefresh } = useRefresh(loadProgress);
  const weeklyVolumeSeries = buildWeeklyVolumeSeries(
    weeklyVolume.map((point) => ({
      ...point,
      totalVolume: roundWeight(fromKg(point.totalVolume, unit)),
    })),
  );
  const now = new Date();
  const summary = summarizeTrainingFrequency(weeklyVolume, now);
  // The same week streak as the Routines chip (spec 0035 FR-4), in local weeks.
  const frequency = sessions
    ? {
        ...summary,
        currentStreak: weekStreak(
          sessions.map((session) => new Date(session.startedAt)),
          now,
        ),
      }
    : summary;
  const comparison = sessions && sessions.length > 0 ? weekVolumeComparison(sessions, now) : null;
  const record = sessionRecords ? latestRecord(sessionRecords) : null;
  const showLoading = isLoading && progress.length === 0;
  const hasEmptyState = !isLoading && !errorMessage && progress.length === 0;
  const hasListState = !errorMessage && progress.length > 0;

  const formatAxisDate = (date: string) => formatShortDate(date, i18n.language);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <ScreenTitle title={t('nav.progress')} />
      {/* First load only: tiles, chart and cards to come (spec 0034 FR-15). */}
      {showLoading && !errorMessage ? (
        <SkeletonProgress />
      ) : (
        <>
          {comparison ? <WeekSummaryCard comparison={comparison} unit={unit} /> : null}
          {record ? (
            <LatestRecordCard
              record={record}
              unit={unit}
              onPress={() => router.push(`/progress/exercises/${record.exerciseId}`)}
            />
          ) : null}
          <FrequencySummary summary={frequency} />
          {weeklyVolumeSeries.points.length > 0 ? (
            <ProgressChart
              title={t('progress.weeklyVolume')}
              unit={unit}
              series={weeklyVolumeSeries}
              formatLabel={formatAxisDate}
            />
          ) : null}
          <MuscleDistribution points={muscleVolume} unit={unit} />
        </>
      )}
      {errorMessage ? (
        <StateView
          kind="error"
          message={errorMessage}
          actionLabel={t('common.retry')}
          onAction={() => void onRefresh()}
        />
      ) : null}
      {hasEmptyState ? (
        <StateView
          kind="empty"
          icon="stats-chart-outline"
          title={t('progress.emptyTitle')}
          message={t('progress.emptySubtitle')}
          actionLabel={t('progress.emptyAction')}
          onAction={() => router.push('/routines')}
        />
      ) : null}
      {hasListState ? (
        <View style={styles.list}>
          <Text style={styles.sectionLabel}>{t('progress.byExercise')}</Text>
          {progress.map((exercise) => (
            <Pressable
              key={exercise.exerciseId}
              accessibilityRole="button"
              onPress={() => router.push(`/progress/exercises/${exercise.exerciseId}`)}
              style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
            >
              <CardHeader
                title={exercise.exerciseName}
                trailing={
                  <View style={styles.cardTrailing}>
                    {exercise.isRecordSession ? (
                      <Chip icon="trophy" tone="record" size="sm" label={t('progress.pr')} />
                    ) : null}
                    <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
                  </View>
                }
              />
              {isTimedOrDistance(exercise.trackingType) ? (
                <TimedProgressFigures summary={exercise} />
              ) : (
                <View style={styles.figures}>
                  <Figure
                    label={t('progress.latestLabel')}
                    value={formatWeightValue(exercise.latestWeightKg, unit)}
                    unit={unit}
                    reps={formatValue(exercise.latestReps)}
                  />
                  <Figure
                    label={t('progress.bestLabel')}
                    value={formatWeightValue(exercise.personalBestWeightKg, unit)}
                    unit={unit}
                    reps={formatValue(exercise.personalBestReps)}
                  />
                  <Figure
                    label={t('progress.est1rmShort')}
                    value={formatWeightValue(exercise.bestEstimatedOneRepMax, unit)}
                    unit={unit}
                  />
                </View>
              )}
              <Text style={styles.meta}>
                {t('progress.sessionsCount', { count: exercise.sessionCount })}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Figure({
  label,
  value,
  unit,
  reps,
}: {
  label: string;
  value: string;
  unit: string;
  reps?: string;
}) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.figureValue}>
        {value}
        <Text style={styles.figureUnit}>{` ${unit}`}</Text>
      </Text>
      {reps !== undefined ? <Text style={styles.figureReps}>{`× ${reps}`}</Text> : null}
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
  sectionLabel: {
    ...commonStyles.sectionLabel,
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  cardPressed: {
    ...commonStyles.pressed,
  },
  cardTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
  figureReps: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
  figureUnit: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    ...typeScale.caption,
  },
  meta: {
    ...commonStyles.meta,
  },
});
