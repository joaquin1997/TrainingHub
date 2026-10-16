import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/features/settings/SettingsContext';
import { workoutsClient } from '@/features/workouts/api/workoutsClient';
import { isPerformedSet } from '@/features/workouts/utils/performedSet';
import { exerciseVolumeKg, summarizeSession } from '@/features/workouts/utils/sessionStats';
import {
  activeDurationSeconds,
  formatDayHeading,
  formatDuration,
  formatTime,
} from '@/lib/format';
import { formatDistance, formatSetValues } from '@/lib/tracking';
import { formatWeightValue } from '@/lib/weight';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StatTile } from '@/ui/StatTile';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';
import type { WeightUnit, WorkoutSession, WorkoutSet } from '@workout/domain';

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
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const { settings } = useSettings();
  const unit = settings.unit;

  const loadSession = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setSession(null);
      }

      if (!workoutId) {
        if (shouldUpdate()) {
          setErrorMessage(t('workouts.missingId'));
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextSession = await workoutsClient.getById(workoutId);

        if (shouldUpdate()) {
          if (!nextSession) {
            setErrorMessage(t('workouts.notFound'));
            return;
          }

          setSession(nextSession);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : t('workouts.detailLoadError'),
          );
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [workoutId, t],
  );

  useEffect(() => {
    let isActive = true;

    void loadSession(() => isActive);

    return () => {
      isActive = false;
    };
  }, [loadSession]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StateView kind="loading" message={t('workouts.loadingWorkout')} />
      </View>
    );
  }

  if (!session) {
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

      {session.notes ? (
        <View style={styles.notesCard}>
          <View style={styles.metaRow}>
            <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
            <Text style={styles.sectionLabel}>{t('workouts.notesLabel')}</Text>
          </View>
          <Text style={styles.notes}>{session.notes}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>{t('workouts.exercisesDone')}</Text>
      {session.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
            <Text style={styles.exerciseVolume}>
              {exerciseHeadline(exercise, unit)}
            </Text>
          </View>
          {exercise.sets.map((set) => {
            const type = setTypeLabel(set.type, t);
            const done = isPerformedSet(set);
            return (
              <View key={set.id} style={[styles.setRow, done ? null : styles.setRowSkipped]}>
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={done ? colors.success : colors.textSubtle}
                />
                <Text style={styles.setNum}>{set.order}</Text>
                <Text style={styles.setValue}>
                  {formatSetValues(set, unit)}
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

const styles = StyleSheet.create({
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
    ...commonStyles.heading,
    fontSize: 26,
    lineHeight: 32,
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
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...commonStyles.cardTitle,
    flex: 1,
  },
  exerciseVolume: {
    ...commonStyles.figureUnit,
    color: colors.text,
    paddingTop: 2,
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
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  setValue: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  spacer: {
    flex: 1,
  },
  setRest: {
    color: colors.textSubtle,
    fontFamily: fonts.display,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
