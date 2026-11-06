import { useAuth } from '@/features/auth/AuthContext';
import { useProgressResource } from '@/features/progress/useExerciseProgress';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { progressClient } from '@/features/progress/api/progressClient';
import { GroupedRecordsCard } from '@/features/progress/components/GroupedRecordsCard';
import { groupSessionRecords } from '@/features/progress/utils/groupSessionRecords';
import { useSettings } from '@/features/settings/SettingsContext';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { ShareSheet } from '@/features/workouts/components/ShareSheet';
import { setNumberOf } from '@/features/workouts/utils/setNumber';
import { WarmUpChecklist } from '@/features/workouts/components/WarmUpChecklist';
import { isPerformedSet } from '@/features/workouts/utils/performedSet';
import { buildShareCard } from '@/features/workouts/utils/shareCard';
import {
  formatWorkoutShareText,
  shareRecords,
  type ShareWorkoutInput,
} from '@/features/workouts/utils/shareText';
import { shareWorkoutText } from '@/features/workouts/utils/shareWorkout';
import { exerciseVolumeKg, summarizeSession } from '@/features/workouts/utils/sessionStats';
import {
  activeDurationSeconds,
  formatDayHeading,
  formatDuration,
  formatTime,
} from '@/lib/format';
import { formatDistance, formatSetValues, sideLabels } from '@/lib/tracking';
import { formatWeightValue } from '@/lib/weight';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StatTile } from '@/ui/StatTile';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';
import { CardHeader } from '@/ui/CardHeader';
import type { WeightUnit, WorkoutSet } from '@workout/domain';

/**
 * The figure beside an exercise: its volume, or for time and distance work
 * (no volume) its total time and distance (spec 0021 FR-5).
 */
function exerciseHeadline(exercise: { sets: WorkoutSet[] }, unit: WeightUnit) {
  const volumeKg = exerciseVolumeKg(exercise);
  const { durationSeconds, distanceMeters } = summarizeSession({ exercises: [exercise] });

  if (volumeKg > 0 || (durationSeconds === 0 && distanceMeters === 0)) {
    return `${formatWeightValue(volumeKg, unit)} ${unit}`;
  }

  return [
    distanceMeters > 0 ? formatDistance(distanceMeters) : null,
    durationSeconds > 0 ? formatDuration(durationSeconds) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function setTypeLabel(type: WorkoutSet['type'], t: TFunction) {
  switch (type) {
    case 'warmup':
      return t('workouts.setType.warmup');
    case 'drop':
      return t('workouts.setType.drop');
    case 'failure':
      return t('workouts.setType.failure');
    default:
      return null;
  }
}

export function WorkoutSessionDetailScreen() {
  useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { settings } = useSettings();
  const unit = settings.unit;
  const readSession = useCallback(async () => {
    if (!workoutId || !user) throw new Error(t('workouts.missingId'));
    return workoutsClient.getById(workoutId);
  }, [workoutId, user?.id, i18n.language]);
  const readRecords = useCallback(async () => {
    if (!workoutId || !user) return [];
    const allRecords = await progressClient.sessionRecords();
    return allRecords.find((entry) => entry.workoutId === workoutId)?.records ?? [];
  }, [workoutId, user?.id, i18n.language]);
  const sessionState = useProgressResource(`${user?.id}:${workoutId}:saved-session`, readSession);
  const recordsState = useProgressResource(`${user?.id}:${workoutId}:saved-records`, readRecords);
  const session = sessionState.data?.userId === user?.id ? sessionState.data : null;
  const records = recordsState.data ?? [];
  const loadSession = () => Promise.all([sessionState.reload(), recordsState.reload()]);
  const errorMessage = sessionState.error instanceof Error ? sessionState.error.message : undefined;

  if (sessionState.loading && !session) {
    return (
      <View style={styles.screen}>
        <StateView kind="loading" message={t('workouts.loadingWorkout')} />
      </View>
    );
  }

  if (!session || session.userId !== user?.id) {
    return (
      <View style={styles.screen}>
        <StateView
          kind="error"
          message={errorMessage ?? t('workouts.notFound')}
          actionLabel={t('common.retry')}
          onAction={() => void loadSession()}
        />
        <Button
          label={t('workouts.backToHistory')}
          variant="ghost"
          onPress={() => router.replace('/history')}
          style={styles.centered}
        />
      </View>
    );
  }

  const totals = summarizeSession(session);
  const when = session.completedAt ?? session.startedAt;
  // One input for both share formats: the 0028 text and the image card (FR-25).
  const shareInput: ShareWorkoutInput = {
    when,
    durationSeconds: session.completedAt
      ? activeDurationSeconds(session.startedAt, session.completedAt, session.pausedSeconds)
      : null,
    volumeKg: totals.volumeKg,
    unit,
    language: i18n.language,
    exercises: session.exercises.map((exercise) => ({
      name: exercise.exerciseName,
      sets: exercise.sets.map((set) => ({ ...set, performed: isPerformedSet(set) })),
    })),
    notes: session.notes,
    records: shareRecords(records, unit, t),
    t,
  };
  const timeRange = session.completedAt
    ? `${formatTime(session.startedAt, i18n.language)} – ${formatTime(session.completedAt, i18n.language)}`
    : formatTime(session.startedAt, i18n.language);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{formatDayHeading(when, i18n.language)}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.meta}>{timeRange}</Text>
        </View>
      </View>

      {sessionState.error ? <StateView kind="error" message={t('progress.records.summaryRefreshFailed')}
        actionLabel={t('common.retry')} onAction={() => void sessionState.reload()} /> : null}
      {/* Session summary of what was actually done. */}
      <View style={styles.tiles}>
        <StatTile
          label={t('workouts.duration')}
          value={
            session.completedAt
              ? formatDuration(
                  activeDurationSeconds(
                    session.startedAt,
                    session.completedAt,
                    session.pausedSeconds,
                  ),
                )
              : '–'
          }
        />
        <StatTile
          label={t('workouts.setsLabel')}
          value={String(totals.doneSets)}
          caption={t('workouts.setsOfTotal', { total: totals.totalSets })}
        />
      </View>
      <View style={styles.tiles}>
        <StatTile
          label={t('workouts.volumeLabel')}
          value={formatWeightValue(totals.volumeKg, unit)}
          unit={unit}
        />
        <StatTile
          label={t('workouts.restLabel')}
          value={totals.restSeconds > 0 ? formatDuration(totals.restSeconds) : '–'}
        />
      </View>
      {totals.durationSeconds > 0 || totals.distanceMeters > 0 ? (
        <View style={styles.tiles}>
          {totals.durationSeconds > 0 ? (
            <StatTile label={t('workouts.setTimeLabel')} value={formatDuration(totals.durationSeconds)} />
          ) : null}
          {totals.distanceMeters > 0 ? (
            <StatTile label={t('workouts.distanceLabel')} value={formatDistance(totals.distanceMeters)} />
          ) : null}
        </View>
      ) : null}

      {recordsState.error || recordsState.notFound ? <StateView kind="error"
        message={t(recordsState.data ? 'progress.records.recordsRefreshFailed' : 'progress.records.recordsLoadFailed')}
        actionLabel={t('common.retry')} onAction={() => void recordsState.reload()} /> : null}
      <GroupedRecordsCard title={t('progress.records.beaten')} unit={unit}
        groups={groupSessionRecords(records, session.exercises)} />

      {session.notes ? (
        <View style={styles.notesCard}>
          <View style={styles.metaRow}>
            <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
            <Text style={styles.sectionLabel}>{t('workouts.notesLabel')}</Text>
          </View>
          <Text style={styles.notes}>{session.notes}</Text>
        </View>
      ) : null}

      {Number.isSafeInteger(session.revision) ? <Button
        label={t('workouts.correction.edit')} icon="create-outline" variant="secondary" fullWidth
        onPress={() => router.push({ pathname: '/workouts/correct', params: { workoutId: session.id } })}
      /> : <Text style={styles.meta}>{t('workouts.correction.unsupported')}</Text>}
      <Button
        label={t('workouts.share.action')}
        icon="share-outline"
        variant="secondary"
        fullWidth
        onPress={() => setIsShareOpen(true)}
      />
      {isShareOpen ? (
        <ShareSheet
          visible
          card={buildShareCard(shareInput)}
          onShareText={() => void shareWorkoutText(formatWorkoutShareText(shareInput))}
          onClose={() => setIsShareOpen(false)}
        />
      ) : null}

      {/* What the warm-up block ticked (spec 0024 FR-7). */}
      <WarmUpChecklist
        items={(session.warmUpItems ?? []).map((item) => ({ ...item, key: String(item.order) }))}
      />

      <Text style={styles.sectionLabel}>{t('workouts.exercisesDone')}</Text>
      {session.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <CardHeader
            title={exercise.exerciseName}
            trailing={<Text style={styles.exerciseVolume}>{exerciseHeadline(exercise, unit)}</Text>}
          />
          {exercise.notes ? <Text style={styles.notes}>{exercise.notes}</Text> : null}
          {exercise.sets.map((set) => {
            const type = setTypeLabel(set.type, t);
            const done = isPerformedSet(set);
            return (
              <View key={set.id} style={[styles.setRow, done ? null : styles.setRowSkipped]}>
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={done ? colors.successInk : colors.textSubtle}
                />
                <Text style={styles.setNum}>{setNumberOf(exercise.sets, set.id)?.number ?? set.order}</Text>
                <Text style={styles.setValue}>
                  {formatSetValues(set, unit, sideLabels(t))}
                </Text>
                {type ? (
                  <Chip label={type} size="sm" tone={set.type === 'failure' ? 'record' : 'neutral'} />
                ) : null}
                <View style={styles.spacer} />
                {set.restSeconds ? (
                  <Text style={styles.setRest}>{formatDuration(set.restSeconds)}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = createStyles(() => ({
  screen: {
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  centered: {
    alignSelf: 'center',
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...commonStyles.title,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meta: {
    ...commonStyles.meta,
  },
  sectionLabel: {
    ...commonStyles.sectionLabel,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  notesCard: {
    ...commonStyles.card,
  },
  notes: {
    ...commonStyles.body,
    color: colors.text,
  },
  card: {
    ...commonStyles.card,
    gap: spacing.xs,
  },
  exerciseVolume: {
    ...commonStyles.figureUnit,
    color: colors.text,
    paddingTop: spacing.xxs,
  },
  setRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
  },
  setRowSkipped: {
    opacity: 0.55,
  },
  setNum: {
    width: 18,
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
  setValue: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
    fontVariant: ['tabular-nums'],
  },
  spacer: {
    flex: 1,
  },
  setRest: {
    color: colors.textSubtle,
    fontFamily: fonts.display,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
}));
