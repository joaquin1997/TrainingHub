import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import type { ExerciseProgressPoint } from '@workout/domain';

import { useAuth } from '@/features/auth/AuthContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { progressClient } from '../api/progressClient';
import { ProgressChart } from '../components/ProgressChart';
import { RecordsCard } from '../components/RecordsCard';
import { useProgressResource } from '../useExerciseProgress';
import {
  detailSeries, filterProgressPeriod, formatMetricValue, formatProgressDuration, heaviestSetText,
  metricsFor, metricUnit, PROGRESS_PERIODS, standaloneWeight,
  type DetailMetric, type ProgressPeriod,
} from '../utils/progressMetrics';
import { formatDateTime } from '@/lib/format';
import { formatDistance, sideLabels } from '@/lib/tracking';
import { Button } from '@/ui/Button';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, createStyles, radii, spacing, typeScale, useTheme } from '@/ui/theme';

export function ExerciseProgressDetailScreen({ origin = 'progress' }: { origin?: 'progress' | 'exercise' }) {
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  // Remount local choices only on identity change, not on focus/refresh/unit change.
  return <ExerciseProgressView key={`${user?.id}:${exerciseId}`} exerciseId={exerciseId}
    language={i18n.language} origin={origin} />;
}

function ExerciseProgressView({ exerciseId, language, origin }: {
  exerciseId?: string; language: string; origin: 'progress' | 'exercise';
}) {
  useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();
  const unit = settings.unit;
  const [selectedMetric, setMetric] = useState<DetailMetric>();
  const [period, setPeriod] = useState<ProgressPeriod>('threeMonths');
  const read = useCallback(() => {
    if (!exerciseId || !user) return Promise.reject(new Error(t('progress.notAvailable')));
    return progressClient.getByExerciseId(exerciseId);
  }, [exerciseId, user?.id, language]);
  const state = useProgressResource(`${user?.id}:${exerciseId}`, read);
  const progress = state.data;
  const goBack = () => router.canGoBack() ? router.back() :
    router.replace(origin === 'exercise' && exerciseId ? `/exercises/${exerciseId}` : '/progress');
  const available = metricsFor(progress?.trackingType);
  const metric = selectedMetric && available.includes(selectedMetric) ? selectedMetric : available[0];
  const points = filterProgressPeriod(progress?.points ?? [], period, new Date());
  const series = detailSeries(points, metric);
  const latest = progress?.points.at(-1);
  const readable = progress?.readableProgressVersion === 1;
  const labels = sideLabels(t);
  const date = (value: string) => formatDateTime(value, language);

  function figures(point: ExerciseProgressPoint) {
    const lines: string[] = [];
    const paired = heaviestSetText(point, unit, labels);
    if (paired && progress?.trackingType !== 'reps') lines.push(`${t('progress.readable.metrics.weight')}: ${paired}`);
    // Separate labels never suggest independent maxima were one performed set.
    if (point.bestReps !== undefined) lines.push(`${t('progress.readable.metrics.reps')}: ${point.bestReps}`);
    if (point.totalWorkingReps !== undefined) lines.push(`${t('progress.readable.metrics.totalReps')}: ${point.totalWorkingReps}`);
    if (point.bestDurationSeconds !== undefined) lines.push(`${t('progress.readable.metrics.duration')}: ${formatProgressDuration(point.bestDurationSeconds)}`);
    if (point.bestDistanceMeters !== undefined) lines.push(`${t('progress.readable.metrics.distance')}: ${formatDistance(point.bestDistanceMeters)}`);
    if (progress?.trackingType === 'weight_reps' && point.sessionVolumeKg !== undefined)
      lines.push(`${t('progress.readable.metrics.volume')}: ${standaloneWeight(point.sessionVolumeKg, unit)}`);
    return lines.length ? lines.join('\n') : t('progress.readable.noWorkingFigures');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={state.loading && !!progress} onRefresh={() => void state.reload()} />}>
      <Button label={t('progress.readable.back')} variant="ghost" onPress={goBack} />
      <Text style={styles.title}>{progress?.exerciseName ?? t('nav.exerciseProgress')}</Text>
      {state.loading && !progress ? <StateView kind="loading" message={t('progress.loading')} /> : null}
      {state.error ? <StateView kind="error" message={t(progress ? 'progress.readable.refreshFailed' : 'progress.loadError')}
        actionLabel={t('common.retry')} onAction={() => void state.reload()} /> : null}
      {state.notFound ? <StateView kind="empty" message={t('progress.readable.noHistory')} /> : null}
      {progress && !readable ? <StateView kind="error" message={t('progress.readable.updateRequired')}
        actionLabel={t('common.retry')} onAction={() => void state.reload()} /> : null}
      {progress && readable ? <>
        <Text style={styles.meta}>{t('progress.sessionsCount', { count: progress.sessionCount })}</Text>
        {latest ? <View style={styles.card}>
          <Text style={styles.heading}>{t('progress.readable.latest')}</Text>
          <Text style={styles.meta}>{date(latest.date)}</Text>
          <Text style={styles.figures}>{figures(latest)}</Text>
        </View> : null}
        <Text style={styles.heading}>{t('progress.readable.metric')}</Text>
        <View style={styles.controls} accessibilityRole="radiogroup" accessibilityLabel={t('progress.readable.metric')}>
          {available.map((choice) => <Pressable key={choice} accessibilityRole="radio"
            aria-checked={metric === choice} accessibilityState={{ checked: metric === choice }} onPress={() => setMetric(choice)}
            style={[styles.choice, metric === choice && styles.selected]}>
            <Text style={metric === choice ? styles.selectedText : styles.choiceText}>{t(`progress.readable.metrics.${choice}`)}</Text>
          </Pressable>)}
        </View>
        {metric === 'volume' || metric === 'estimate' ? <Text style={styles.meta}>
          {t(`progress.readable.${metric}Explanation`)}</Text> : null}
        <Text style={styles.heading}>{t('progress.readable.period')}</Text>
        <View style={styles.controls} accessibilityRole="radiogroup" accessibilityLabel={t('progress.readable.period')}>
          {PROGRESS_PERIODS.map((choice) => <Pressable key={choice} accessibilityRole="radio"
            aria-checked={period === choice} accessibilityState={{ checked: period === choice }} onPress={() => setPeriod(choice)}
            style={[styles.choice, period === choice && styles.selected]}>
            <Text style={period === choice ? styles.selectedText : styles.choiceText}>{t(`progress.readable.periods.${choice}`)}</Text>
          </Pressable>)}
        </View>
        {series.points.length ? <ProgressChart key={`${metric}:${period}:${points.map((p) => p.workoutId).join(',')}`}
          title={t(`progress.readable.metrics.${metric}`)} series={series} unit={metricUnit(metric, unit)}
          inspectable formatLabel={date} formatValue={(value) => formatMetricValue(value, metric, unit, t('progress.readable.repsUnit'))} />
          : <StateView kind="empty" message={t('progress.readable.noPoints')}
            actionLabel={t('progress.readable.periods.all')} onAction={() => setPeriod('all')} />}
        <RecordsCard stacked title={t('progress.readable.allTimeRecords')} unit={unit}
          items={(progress.records ?? []).map((record, index) => ({ key: `${record.type}:${index}`, record, meta: date(record.date) }))} />
        <Text style={styles.heading}>{t('progress.sessionsLabel')} · {t(`progress.readable.periods.${period}`)}</Text>
        {points.slice().reverse().map((point) => <View key={point.workoutId ?? point.date} style={styles.card}>
          <Text style={styles.heading}>{date(point.date)}</Text>
          <Text style={styles.figures}>{figures(point)}</Text>
          {point.workoutId ? <Button label={t('progress.readable.openWorkout')} variant="secondary"
            onPress={() => router.push(`/workouts/${point.workoutId}`)} /> : null}
        </View>)}
      </> : null}
    </ScrollView>
  );
}

const styles = createStyles(() => ({
  screen: { ...commonStyles.screen },
  container: { ...commonStyles.scrollContent },
  title: { ...commonStyles.title },
  heading: { color: colors.text, ...typeScale.body, fontWeight: '700' },
  meta: { ...commonStyles.meta },
  figures: { color: colors.text, ...typeScale.body },
  card: { ...commonStyles.card, gap: spacing.sm },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceRaised, maxWidth: '100%', minHeight: 44, justifyContent: 'center' },
  selected: { backgroundColor: colors.primary, borderColor: colors.primaryInk },
  choiceText: { color: colors.text, ...typeScale.caption, flexShrink: 1 },
  selectedText: { color: colors.onPrimary, ...typeScale.caption, flexShrink: 1, fontWeight: '700' },
}));
