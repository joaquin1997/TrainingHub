import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RunningRest } from '@/features/workouts/state/workoutDraftStore';
import { useRestRemaining } from '@/features/workouts/restTimer/useRestRemaining';
import { formatDuration } from '@/lib/format';
import { Button } from '@/ui/Button';
import { colors, commonStyles, radii, spacing, typeScale } from '@/ui/theme';
import { useReducedMotion } from '@/ui/useReducedMotion';

interface RestBarProps {
  rest: RunningRest;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
  /** The set to do after the rest, e.g. "Barbell row · set 2" (spec 0029 FR-10). */
  next?: string | null;
}

/**
 * The fill's share of the track, draining continuously to 0 at `endsAt`
 * (spec 0034 FR-8) instead of stepping once a second. Restarts from the true
 * remaining time whenever the rest is adjusted (±15 s) or replaced.
 */
function useDrain(rest: RunningRest, enabled: boolean): Animated.Value {
  const fraction = () => {
    const remainingMs = Math.max(0, new Date(rest.endsAt).getTime() - Date.now());
    return rest.totalSeconds > 0 ? Math.min(1, remainingMs / (rest.totalSeconds * 1000)) : 0;
  };
  const value = useRef(new Animated.Value(fraction())).current;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const remainingMs = Math.max(0, new Date(rest.endsAt).getTime() - Date.now());
    value.setValue(fraction());
    const animation = Animated.timing(value, {
      toValue: 0,
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [rest.endsAt, rest.totalSeconds, enabled]);

  return value;
}

/**
 * The running rest, pinned below the workout list (spec 0018 FR-4). It sits in
 * the layout flow, so it never covers the last set or the Finish button.
 */
export function RestBar({ rest, onAdjust, onSkip, next }: RestBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const remaining = useRestRemaining(rest);
  const progress = rest.totalSeconds > 0 ? Math.min(1, remaining / rest.totalSeconds) : 0;
  const reducedMotion = useReducedMotion();
  const drain = useDrain(rest, !reducedMotion);

  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={t('workouts.restBarLabel', { clock: formatDuration(remaining) })}
      style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}
    >
      <View style={styles.track}>
        {reducedMotion ? (
          // Reduce Motion: the fill steps once a second with the figure (FR-9).
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        ) : (
          <Animated.View style={[styles.fill, styles.fillDraining, { transform: [{ scaleX: drain }] }]} />
        )}
      </View>
      {next ? (
        <Text style={styles.next} numberOfLines={1}>
          {t('workouts.restNext', { set: next })}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Ionicons name="timer-outline" size={18} color={colors.accent} />
        <View style={styles.text}>
          <Text style={styles.label}>{t('workouts.rest')}</Text>
          <Text style={styles.clock}>{formatDuration(remaining)}</Text>
        </View>
        <Button label="−15 s" variant="secondary" onPress={() => onAdjust(-15)} style={styles.step} />
        <Button label="+15 s" variant="secondary" onPress={() => onAdjust(15)} style={styles.step} />
        <Button
          label={t('workouts.skip')}
          icon="play-skip-forward"
          variant="secondary"
          onPress={onSkip}
          style={styles.step}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.accent,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  track: {
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  fillDraining: {
    width: '100%',
    transformOrigin: 'left',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
  },
  label: {
    ...commonStyles.sectionLabel,
  },
  clock: {
    ...commonStyles.figure,
    color: colors.accent,
  },
  next: {
    ...commonStyles.meta,
    color: colors.text,
  },
  step: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
});
