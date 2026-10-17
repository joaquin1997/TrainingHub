import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import { ExerciseImage } from '@/features/exercises/components/ExerciseImage';
import { TrackingTypeControl } from '@/features/exercises/components/TrackingTypeControl';
import { UnilateralSwitch } from '@/features/exercises/components/UnilateralSwitch';
import { useAuth } from '@/features/auth/AuthContext';
import { pickProfilePhoto } from '@/features/profile/photo/pickProfilePhoto';
import { progressClient } from '@/features/progress/api/progressClient';
import { useSettings } from '@/features/settings/SettingsContext';
import { formatDate } from '@/lib/format';
import { formatSetValues, tracksField } from '@/lib/tracking';
import { formatWeightValue } from '@/lib/weight';
import { ActionSheet } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, fonts, radii, spacing } from '@/ui/theme';
import type { Exercise, ExerciseProgressPoint, ExerciseTrackingType } from '@workout/domain';

const MAX_HISTORY = 8;

function formatHistoryValue(value?: number) {
  return value === undefined ? '-' : String(value);
}

export function ExerciseDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseProgressPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const { settings } = useSettings();
  const { user } = useAuth();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string>();
  const [unilateralBusy, setUnilateralBusy] = useState(false);
  const [unilateralError, setUnilateralError] = useState<string>();
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [trackingError, setTrackingError] = useState<string>();
  /** The type waiting for the person's confirmation (FR-14). */
  const [pendingTrackingType, setPendingTrackingType] = useState<ExerciseTrackingType>();
  const unit = settings.unit;

  const loadExercise = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (shouldUpdate()) {
        setIsLoading(true);
        setErrorMessage(undefined);
        setExercise(null);
      }

      if (!exerciseId) {
        if (shouldUpdate()) {
          setErrorMessage(t('exercises.missingId'));
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextExercise = await exercisesClient.getById(exerciseId);

        if (shouldUpdate()) {
          setExercise(nextExercise);
        }
      } catch (error) {
        if (shouldUpdate()) {
          setErrorMessage(
            error instanceof Error ? error.message : t('exercises.detailLoadError'),
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

    void loadExercise(() => isActive);

    return () => {
      isActive = false;
    };
  }, [loadExercise]);

  useEffect(() => {
    if (!exerciseId) {
      return;
    }

    let isActive = true;

    // Best-effort: a 404 (no logged sessions yet) just leaves history empty.
    progressClient
      .getByExerciseId(exerciseId)
      .then((detail) => {
        if (isActive) {
          setHistory(detail.points);
        }
      })
      .catch(() => {
        if (isActive) {
          setHistory([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [exerciseId]);

  async function handleChangePhoto() {
    if (!exercise) {
      return;
    }
    try {
      setPhotoError(undefined);
      const imageBase64 = await pickProfilePhoto();
      if (!imageBase64) {
        return;
      }
      setPhotoBusy(true);
      await exercisesClient.setPhoto(exercise.id, { imageBase64 });
      setExercise(await exercisesClient.getById(exercise.id));
    } catch {
      setPhotoError(t('customExercise.photoNotSaved'));
    } finally {
      setPhotoBusy(false);
    }
  }

  /** Marks the exercise as done one side at a time, or not (spec 0022 FR-1). */
  async function handleUnilateralChange(isUnilateral: boolean) {
    if (!exercise) {
      return;
    }
    const previous = exercise;
    try {
      setUnilateralError(undefined);
      setUnilateralBusy(true);
      setExercise({ ...exercise, isUnilateral });
      setExercise(await exercisesClient.setUnilateral(exercise.id, { isUnilateral }));
    } catch {
      setExercise(previous);
      setUnilateralError(t('customExercise.unilateralError'));
    } finally {
      setUnilateralBusy(false);
    }
  }

  /** Changes what the exercise's sets record, by hand (spec 0030 FR-12). */
  async function changeTrackingType(trackingType: ExerciseTrackingType) {
    if (!exercise) {
      return;
    }
    const previous = exercise;
    try {
      setTrackingError(undefined);
      setTrackingBusy(true);
      setExercise({ ...exercise, trackingType });
      setExercise(await exercisesClient.setTrackingType(exercise.id, { trackingType }));
    } catch {
      setExercise(previous);
      setTrackingError(t('customExercise.trackingError'));
    } finally {
      setTrackingBusy(false);
    }
  }

  /** With saved workouts, the person is told what changes first (FR-14). */
  function requestTrackingType(trackingType: ExerciseTrackingType) {
    if (history.length > 0) {
      setPendingTrackingType(trackingType);
    } else {
      void changeTrackingType(trackingType);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StateView kind="loading" message={t('exercises.loadingExercise')} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.screen}>
        <StateView
          kind="error"
          message={errorMessage ?? t('exercises.notFound')}
          actionLabel={t('exercises.backToExercises')}
          onAction={() => router.replace('/exercises')}
        />
      </View>
    );
  }

  const primary = exercise.primaryMuscleGroups ?? [];
  const secondary = exercise.secondaryMuscleGroups ?? [];
  const equipment = exercise.equipment ?? [];
  const chipGroups: Array<{ label: string; values: string[]; tone: 'primary' | 'neutral' }> = [
    { label: t('exercises.primaryLabel'), values: primary, tone: 'primary' },
    { label: t('exercises.secondaryLabel'), values: secondary, tone: 'neutral' },
    { label: t('exercises.equipmentLabel'), values: equipment, tone: 'neutral' },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{exercise.name}</Text>
      <ExerciseImage
        imageUrl={exercise.imageUrl}
        style={styles.image}
        accessibilityLabel={t('exercises.illustration', { name: exercise.name })}
        fallback={null}
      />
      {!exercise.isSystemDefined && exercise.createdByUserId === user?.id ? (
        <>
          <Button
            label={exercise.imageUrl ? t('customExercise.changePhoto') : t('customExercise.addPhoto')}
            icon="image-outline"
            variant="secondary"
            disabled={photoBusy}
            onPress={() => void handleChangePhoto()}
          />
          {photoError ? <Text style={styles.meta}>{photoError}</Text> : null}
        </>
      ) : null}
      {/* Same rule as the unilateral switch: catalog for anyone, custom for its creator. */}
      {exercise.isSystemDefined || exercise.createdByUserId === user?.id ? (
        <View style={styles.card}>
          <TrackingTypeControl
            value={exercise.trackingType ?? 'weight_reps'}
            onChange={requestTrackingType}
            disabled={trackingBusy}
          />
          {trackingError ? <Text style={styles.meta}>{trackingError}</Text> : null}
        </View>
      ) : null}
      <ActionSheet
        visible={pendingTrackingType !== undefined}
        title={
          pendingTrackingType
            ? t('customExercise.trackingChangeTitle', {
                type: t(`customExercise.trackingTypes.${pendingTrackingType}`),
              })
            : undefined
        }
        message={t('customExercise.trackingChangeMessage')}
        actions={
          pendingTrackingType
            ? [
                {
                  label: t('customExercise.trackingChangeConfirm', {
                    type: t(`customExercise.trackingTypes.${pendingTrackingType}`),
                  }),
                  onPress: () => void changeTrackingType(pendingTrackingType),
                },
              ]
            : []
        }
        onClose={() => setPendingTrackingType(undefined)}
      />
      {tracksField(exercise.trackingType, 'reps') &&
      (exercise.isSystemDefined || exercise.createdByUserId === user?.id) ? (
        <View style={styles.card}>
          <UnilateralSwitch
            value={exercise.isUnilateral ?? false}
            onChange={(value) => void handleUnilateralChange(value)}
            disabled={unilateralBusy}
          />
          {unilateralError ? <Text style={styles.meta}>{unilateralError}</Text> : null}
        </View>
      ) : null}
      <View style={styles.card}>
        {chipGroups.map((group) => (
          <View key={group.label} style={styles.chipGroup}>
            <Text style={styles.sectionLabel}>{group.label}</Text>
            {group.values.length > 0 ? (
              <View style={styles.chips}>
                {group.values.map((value) => (
                  <Chip key={value} label={value} size="sm" tone={group.tone} />
                ))}
              </View>
            ) : (
              <Text style={styles.meta}>–</Text>
            )}
          </View>
        ))}
      </View>
      {exercise.description ? (
        <Text style={styles.body}>{exercise.description}</Text>
      ) : null}
      {history.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t('exercises.recentSessions')}</Text>
          {history
            .slice()
            .reverse()
            .slice(0, MAX_HISTORY)
            .map((point, index) => (
              <View key={`${point.date}-${index}`} style={styles.historyRow}>
                <Text style={styles.historyDate}>{formatDate(point.date, i18n.language)}</Text>
                <Text style={styles.historyValue}>
                  {point.bestDurationSeconds !== undefined || point.bestDistanceMeters !== undefined
                    ? formatSetValues(
                        {
                          weightKg: point.bestWeightKg,
                          durationSeconds: point.bestDurationSeconds,
                          distanceMeters: point.bestDistanceMeters,
                        },
                        unit,
                      )
                    : `${formatWeightValue(point.bestWeightKg, unit)} ${unit} × ${formatHistoryValue(point.bestReps)}`}
                </Text>
              </View>
            ))}
          <Button
            label={t('exercises.viewFullProgress')}
            icon="trending-up"
            variant="secondary"
            fullWidth
            onPress={() => router.push(`/progress/exercises/${exercise.id}`)}
          />
        </View>
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
  centered: {
    alignSelf: 'center',
  },
  title: {
    ...commonStyles.heading,
    fontSize: 28,
    lineHeight: 34,
  },
  body: {
    ...commonStyles.body,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    backgroundColor: colors.imageBackdrop,
  },
  card: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  chipGroup: {
    gap: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sectionLabel: {
    ...commonStyles.sectionLabel,
  },
  historyRow: {
    minHeight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: 14,
  },
  historyValue: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    ...commonStyles.meta,
  },
});
