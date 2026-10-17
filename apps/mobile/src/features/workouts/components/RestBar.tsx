import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RunningRest } from '@/features/workouts/state/workoutDraftStore';
import { useRestRemaining } from '@/features/workouts/restTimer/useRestRemaining';
import { formatDuration } from '@/lib/format';
import { Button } from '@/ui/Button';
import { colors, commonStyles, spacing } from '@/ui/theme';

interface RestBarProps {
  rest: RunningRest;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}

/**
 * The running rest, pinned below the workout list (spec 0018 FR-4). It sits in
 * the layout flow, so it never covers the last set or the Finish button.
 */
export function RestBar({ rest, onAdjust, onSkip }: RestBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const remaining = useRestRemaining(rest);
  const progress = rest.totalSeconds > 0 ? Math.min(1, remaining / rest.totalSeconds) : 0;

  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={t('workouts.restBarLabel', { clock: formatDuration(remaining) })}
      style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
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
    borderRadius: 2,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
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
    fontSize: 10,
  },
  clock: {
    ...commonStyles.figure,
    fontSize: 22,
    lineHeight: 26,
    color: colors.accent,
  },
  step: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
});
