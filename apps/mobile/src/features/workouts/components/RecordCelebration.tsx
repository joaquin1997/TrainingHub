import { useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Animated, AppState, View } from 'react-native';

import {
  parseCelebrated,
  shouldCelebrate,
  withCelebrated,
} from '@/features/workouts/utils/celebration';
import { deviceKeys, deviceStore } from '@/lib/deviceStore';
import { haptics } from '@/ui/haptics';
import { colors, createStyles, radii, spacing, useTheme } from '@/ui/theme';
import { useReducedMotion } from '@/ui/useReducedMotion';

interface RecordCelebrationProps {
  /** The workout identity (spec 0014): celebrated at most once on this device. */
  workoutId: string | undefined;
  recordCount: number;
  children: ReactNode;
}

const BURST_MS = 900;

/**
 * The record celebration (spec 0037 FR-15 – FR-22) around the summary's
 * "Records today" block: once per workout, a lime burst behind and around
 * the block with the *record* haptic; under Reduce Motion a static lime edge
 * instead. Never over the text, never in the way of a tap or a scroll.
 */
export function RecordCelebration({ workoutId, recordCount, children }: RecordCelebrationProps) {
  useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(true);
  const [phase, setPhase] = useState<'none' | 'burst' | 'static'>('none');
  const progress = useRef(new Animated.Value(0)).current;
  const started = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    if (started.current || !focused || AppState.currentState !== 'active') {
      return;
    }
    let active = true;
    void deviceStore.get(deviceKeys.celebratedWorkouts).then(async (raw) => {
      const celebrated = parseCelebrated(raw);
      if (!active || started.current || !shouldCelebrate({ workoutId, recordCount, inFront: true, celebrated })) {
        return;
      }
      started.current = true;
      await deviceStore.set(deviceKeys.celebratedWorkouts, JSON.stringify(withCelebrated(celebrated, workoutId!)));
      // One pulse, not one per record (FR-15, FR-21).
      haptics.record();
      AccessibilityInfo.announceForAccessibility(t('workouts.recordsAnnounce', { count: recordCount }));
      if (reduceMotion) {
        setPhase('static');
        return;
      }
      setPhase('burst');
      Animated.timing(progress, { toValue: 1, duration: BURST_MS, useNativeDriver: true }).start(() =>
        setPhase('none'),
      );
    });
    return () => {
      active = false;
    };
  }, [focused, recordCount, workoutId]);

  return (
    <View style={[styles.container, phase === 'static' ? styles.staticEdge : null]}>
      {phase === 'burst' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.burst,
            {
              opacity: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.55, 0] }),
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) },
              ],
            },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = createStyles(() => ({
  container: {
    borderRadius: radii.lg,
  },
  staticEdge: {
    borderWidth: 2,
    borderColor: colors.primaryInk,
    padding: spacing.xxs,
  },
  burst: {
    position: 'absolute',
    top: -spacing.md,
    right: -spacing.md,
    bottom: -spacing.md,
    left: -spacing.md,
    // A halo around the block, never under it: the block's tint is
    // translucent, and the burst must not sit under its text (FR-17).
    borderRadius: radii.lg + spacing.md,
    borderWidth: spacing.md,
    borderColor: colors.primaryInk,
  },
}));
