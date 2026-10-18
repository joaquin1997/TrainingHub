import type { LiveRecordHit, WeightUnit } from '@workout/domain';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing } from 'react-native';

import { Chip } from '@/ui/Chip';
import { createStyles, spacing, useTheme } from '@/ui/theme';
import { useReducedMotion } from '@/ui/useReducedMotion';

import { recordBadgeAccessibilityLabel, recordBadgeLabel } from './recordBadgeLabel';

/**
 * A brief scale-up and settle (spec 0034 FR-7) each time `pop` turns true —
 * on mount when it starts true. Under Reduce Motion nothing moves (FR-9).
 * Shared by the record badge and the set row's status area.
 */
export function usePop(pop: boolean): Animated.Value {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(pop && !reducedMotion ? 0.6 : 1)).current;

  useEffect(() => {
    if (!pop || reducedMotion) {
      scale.setValue(1);
      return;
    }
    scale.setValue(0.6);
    const animation = Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.08,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 110,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
    // Only a change of `pop` replays it; a re-render does not.
  }, [pop]);

  return scale;
}

/**
 * A record badge (spec 0032): on an exercise for its session volume. A notice
 * only — never a stored record. (A set's record lives in its row's status
 * area since spec 0034 FR-19.)
 *
 * `pop` (spec 0034 FR-7): the badge was earned by the tick that just
 * happened, so it appears with a brief scale-up and settle — once, on mount.
 * Scrolling does not remount it and reopening the screen mounts it without
 * `pop`. Under Reduce Motion it simply appears (FR-9).
 */
export function RecordBadge({
  hits,
  unit,
  pop = false,
}: {
  hits: LiveRecordHit[];
  unit: WeightUnit;
  pop?: boolean;
}) {
  useTheme();
  const { t } = useTranslation();
  const scale = usePop(pop);

  return (
    <Animated.View
      style={[styles.badge, { transform: [{ scale }] }]}
      accessible
      accessibilityLabel={recordBadgeAccessibilityLabel(hits, unit, t)}
    >
      <Chip tone="record" icon="trophy" size="sm" label={recordBadgeLabel(hits, unit, t)} />
    </Animated.View>
  );
}

const styles = createStyles(() => ({
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingTop: spacing.xs,
  },
}));
