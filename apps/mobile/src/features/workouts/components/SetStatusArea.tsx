import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { usePop } from '@/features/workouts/liveRecords/RecordBadge';
import { isStatusChecked, type SetStatus } from '@/features/workouts/utils/setStatus';
import { colors, createStyles, radii, useTheme } from '@/ui/theme';
import { useReducedMotion } from '@/ui/useReducedMotion';

/** Length of the done/undone transition (spec 0034 FR-6: about a third of a second at most). */
export const DONE_TRANSITION_MS = 220;

/** Side of the status area: the done target (spec 0034 FR-19, ≥ 44 × 44 pt). */
export const STATUS_AREA_SIZE = 44;

/**
 * 0 → 1 as the set becomes done, back on untick (spec 0034 FR-6). A tick and
 * untick in quick succession just retarget the running animation, so the row
 * always ends in its final state (EF-2). Instant under Reduce Motion (FR-9).
 */
export function useDoneTransition(done: boolean): Animated.Value {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(done ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(done ? 1 : 0);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: done ? 1 : 0,
      duration: DONE_TRANSITION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [done, progress, reducedMotion]);

  return progress;
}

type Look = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  frame: ViewStyle;
};

/** Shape and colour of each status (FR-17: never colour alone). */
/** Read at render time, so it follows the theme (spec 0038). */
const LOOKS = (): Record<SetStatus, Look> => ({
  record: { icon: 'trophy', iconColor: colors.onPrimary, frame: { borderColor: colors.accent } },
  done: { icon: 'checkmark', iconColor: colors.onPrimary, frame: { borderColor: colors.success } },
  generatedWarmup: {
    icon: 'sparkles',
    iconColor: colors.accent,
    frame: { borderColor: colors.accent, borderStyle: 'dashed' },
  },
  upNext: {
    icon: 'checkmark',
    iconColor: colors.primary,
    frame: { borderColor: colors.primary, borderWidth: 2 },
  },
  none: { icon: 'checkmark', iconColor: colors.controlBorder, frame: {} },
});

type Props = {
  status: SetStatus;
  /** The tick that just happened earned the record: the trophy pops once (FR-7). */
  pop?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

/**
 * The one status area of a set row (spec 0034 FR-19): always in the same
 * place, always the done target, showing exactly one status. Done and record
 * fill in with the row's done transition (FR-6); the record's trophy pops when
 * the tick earned it (FR-7).
 */
export function SetStatusArea({ status, pop = false, accessibilityLabel, onPress }: Props) {
  useTheme();
  const checked = isStatusChecked(status);
  const fill = useDoneTransition(checked);
  const scale = usePop(pop && status === 'record');
  const look = LOOKS()[status];
  // An untick fades out the fill it had (orange stays orange while it fades).
  const recordFillRef = useRef(status === 'record');
  if (checked) {
    recordFillRef.current = status === 'record';
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.area, look.frame]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          recordFillRef.current ? styles.fillRecord : null,
          { opacity: fill },
        ]}
      />
      <View pointerEvents="none" style={styles.iconSlot}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name={look.icon} size={20} color={look.iconColor} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = createStyles(() => ({
  area: {
    width: STATUS_AREA_SIZE,
    height: STATUS_AREA_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    // An undone box must stand out from its fill at 3:1 (spec 0034 FR-16).
    borderColor: colors.controlBorder,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.success,
  },
  fillRecord: {
    backgroundColor: colors.accent,
  },
  iconSlot: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
