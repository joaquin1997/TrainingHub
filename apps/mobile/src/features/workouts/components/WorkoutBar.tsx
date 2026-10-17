import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { useRestRemaining } from '@/features/workouts/restTimer/useRestRemaining';
import type { WorkoutSessionDraft } from '@/features/workouts/state/workoutDraftStore';
import { formatDuration } from '@/lib/format';
import { useElapsedSeconds } from '@/lib/useElapsedSeconds';
import { colors, commonStyles, fonts, radii, spacing, typeScale } from '@/ui/theme';

interface WorkoutBarProps {
  /** Pad for the home indicator; only where no tab bar sits below the bar. */
  withBottomInset?: boolean;
}

/**
 * The workout in progress, on every screen but the workout itself (spec 0019).
 * Laid out in flow, never over the content, so it covers neither the last
 * item of a list nor the tab bar (EF-2). Renders nothing with no workout.
 */
export function WorkoutBar({ withBottomInset = false }: WorkoutBarProps) {
  const workout = useActiveWorkout();

  if (!workout) {
    return null;
  }

  return <ActiveWorkoutBar withBottomInset={withBottomInset} workout={workout} />;
}

function ActiveWorkoutBar({
  withBottomInset,
  workout,
}: {
  withBottomInset: boolean;
  workout: WorkoutSessionDraft;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const elapsedSeconds = useElapsedSeconds(workout.startedAt, {
    pausedAt: workout.pausedAt,
    pausedSeconds: workout.pausedSeconds,
  });
  const restRemaining = useRestRemaining(workout.rest);
  const isPaused = Boolean(workout.pausedAt);
  // While a rest runs, the clock is its countdown (spec 0018 FR-4).
  const isResting = Boolean(workout.rest);
  const clock = formatDuration(isResting ? restRemaining : elapsedSeconds);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('workouts.barLabel', {
        routine: workout.routineName,
        clock,
      })}
      // No routine named: an active workout always resumes (spec 0010 FR-6).
      onPress={() => router.push('/workouts/active')}
      style={({ pressed }) => [
        styles.bar,
        withBottomInset ? { paddingBottom: spacing.sm + insets.bottom } : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.dot, isPaused ? styles.dotPaused : null]} />
      <View style={styles.text}>
        <Text style={[styles.label, isResting ? styles.labelResting : null]}>
          {isResting
            ? t('workouts.rest')
            : t(isPaused ? 'routines.pausedLabel' : 'routines.activeLabel')}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {workout.routineName}
        </Text>
      </View>
      <Text
        style={[
          styles.clock,
          isPaused ? styles.clockPaused : null,
          isResting ? styles.clockResting : null,
        ]}
      >
        {clock}
      </Text>
      <Ionicons name="chevron-up" size={18} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.primary,
  },
  pressed: {
    ...commonStyles.pressed,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.round,
    backgroundColor: colors.primary,
  },
  dotPaused: {
    backgroundColor: colors.textMuted,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  label: {
    ...commonStyles.sectionLabel,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
  },
  clock: {
    ...commonStyles.figure,
    color: colors.primary,
  },
  clockPaused: {
    color: colors.textMuted,
  },
  labelResting: {
    color: colors.accent,
  },
  clockResting: {
    color: colors.accent,
  },
});
