import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { progressClient } from '../api/progressClient';
import { FrequencySummary } from '../components/FrequencySummary';
import { LatestRecordCard } from '../components/LatestRecordCard';
import { WeekSummaryCard } from '../components/WeekSummaryCard';
import { MuscleDistribution } from '../components/MuscleDistribution';
import { ProgressChart } from '../components/ProgressChart';
import { buildWeeklyVolumeSeries } from '../utils/chartData';
import { searchTrainedExercises } from '../utils/exerciseSearch';
import { summarizeTrainingFrequency } from '../utils/trainingFrequency';
import { latestRecord, weekVolumeComparison } from '../utils/weekComparison';
import { useProgressResource } from '../useExerciseProgress';
import { formatDateTime, formatShortDate } from '@/lib/format';
import { fromKg, roundWeight } from '@/lib/weight';
import { weekStreak } from '@/lib/week';
import { Button } from '@/ui/Button';
import { ScreenTitle } from '@/ui/ScreenTitle';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, createStyles, radii, keyboardAppearance, spacing, typeScale, useTheme } from '@/ui/theme';

export function ProgressOverviewScreen() {
  const { user } = useAuth();
  return <ProgressOverview key={user?.id ?? 'signed-out'} />;
}
function ProgressOverview() {
  useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const restoring = useRef(false);
  const read = useCallback(() => user ? progressClient.list() : Promise.resolve([]), [user?.id, i18n.language]);
  const state = useProgressResource(`${user?.id}:lookup`, read);
  const readSummary = useCallback(async () => {
    if (!user) return undefined;
    const [weekly, muscle, sessions, records] = await Promise.all([
      progressClient.weeklyVolume(), progressClient.muscleDistribution(), workoutsClient.list(), progressClient.sessionRecords(),
    ]);
    return { weekly, muscle, sessions, records };
  }, [user?.id, i18n.language]);
  const summaryState = useProgressResource(`${user?.id}:summary`, readSummary);
  const summary = summaryState.data;
  useFocusEffect(useCallback(() => {
    restoring.current = true;
    const frame = requestAnimationFrame(() => {
      scroll.current?.scrollTo({ y: offset.current, animated: false });
      restoring.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, []));
  const results = searchTrainedExercises(state.data ?? [], query, i18n.language);
  const filtering = query.trim().length > 0;
  const refresh = async () => { await Promise.all([state.reload(), summaryState.reload()]); };
  const restorePosition = () => {
    if (restoring.current) {
      restoring.current = false;
      scroll.current?.scrollTo({ y: offset.current, animated: false });
    }
  };
  const weeklySeries = buildWeeklyVolumeSeries((summary?.weekly ?? []).map((point) => ({
    ...point, totalVolume: roundWeight(fromKg(point.totalVolume, settings.unit)),
  })));
  const frequency = summary ? {
    ...summarizeTrainingFrequency(summary.weekly, new Date()),
    currentStreak: weekStreak(summary.sessions.map((session) => new Date(session.startedAt)), new Date()),
  } : undefined;
  const comparison = summary ? weekVolumeComparison(summary.sessions, new Date()) : undefined;
  const record = summary ? latestRecord(summary.records) : undefined;

  return <ScrollView ref={scroll} style={styles.screen} contentContainerStyle={styles.container}
    keyboardShouldPersistTaps="handled" onContentSizeChange={restorePosition}
    onScroll={(event) => { if (!restoring.current) offset.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={32}
    refreshControl={<RefreshControl refreshing={state.loading && !!state.data} onRefresh={() => void refresh()} />}>
    <ScreenTitle title={t('nav.progress')} />
    <Text style={styles.heading}>{t('progress.readable.findExercise')}</Text>
    <TextInput keyboardAppearance={keyboardAppearance()} accessibilityLabel={t('progress.readable.search')} placeholder={t('progress.readable.search')}
      placeholderTextColor={colors.textMuted} value={query}
      onChangeText={(value) => { setQuery(value); offset.current = 0; }} style={styles.input} autoCorrect={false} />
    {state.loading && !state.data ? <StateView kind="loading" message={t('progress.loading')} /> : null}
    {state.error ? <StateView kind="error" message={t(state.data ? 'progress.readable.refreshFailed' : 'progress.loadError')}
      actionLabel={t('common.retry')} onAction={() => void state.reload()} /> : null}
    {state.data && results.length === 0 ? <StateView kind="empty"
      message={t(filtering ? 'progress.readable.noMatches' : 'progress.emptySubtitle')}
      actionLabel={t(filtering ? 'progress.readable.clearSearch' : 'progress.emptyAction')}
      onAction={() => filtering ? setQuery('') : router.push('/routines')} /> : null}
    {results.map((exercise) => <Pressable key={exercise.exerciseId} accessibilityRole="button"
      onPress={() => router.push(`/progress/exercises/${exercise.exerciseId}`)}
      style={({ pressed }) => [styles.card, pressed && commonStyles.pressed]}>
      <View style={styles.row}>
        <Text style={styles.resultName}>{exercise.exerciseName}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
      <Text style={styles.meta}>{exercise.lastPerformedAt ? formatDateTime(exercise.lastPerformedAt, i18n.language) : ''}</Text>
      <Text style={styles.meta}>{t('progress.sessionsCount', { count: exercise.sessionCount })}</Text>
    </Pressable>)}
    {!filtering ? <>
      <Text style={styles.heading}>{t('progress.readable.overview')}</Text>
      {summaryState.error ? <StateView kind="error" message={t('progress.readable.refreshFailed')}
        actionLabel={t('common.retry')} onAction={() => void summaryState.reload()} /> : null}
      {comparison ? <WeekSummaryCard comparison={comparison} unit={settings.unit} /> : null}
      {record ? <LatestRecordCard record={record} unit={settings.unit}
        onPress={() => router.push(`/progress/exercises/${record.exerciseId}`)} /> : null}
      {frequency ? <FrequencySummary summary={frequency} /> : null}
      {weeklySeries.points.length ? <ProgressChart title={t('progress.weeklyVolume')} unit={settings.unit} series={weeklySeries}
        formatLabel={(date) => formatShortDate(date, i18n.language)} /> : null}
      {summary ? <MuscleDistribution points={summary.muscle} unit={settings.unit} /> : null}
    </> : <Button label={t('progress.readable.clearSearch')} variant="ghost" onPress={() => setQuery('')} />}
  </ScrollView>;
}
const styles = createStyles(() => ({
  screen: { ...commonStyles.screen },
  container: { ...commonStyles.scrollContent },
  heading: { color: colors.text, ...typeScale.body, fontWeight: '700' },
  input: { ...typeScale.body, color: colors.text, borderColor: colors.border, borderWidth: 1,
    borderRadius: radii.md, padding: spacing.md, minHeight: 48, backgroundColor: colors.surfaceRaised },
  card: { ...commonStyles.card, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultName: { color: colors.text, ...typeScale.body, fontWeight: '700', flex: 1 },
  meta: { ...commonStyles.meta },
}));
