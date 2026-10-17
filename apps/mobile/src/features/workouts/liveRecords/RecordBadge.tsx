import type { LiveRecordHit, WeightUnit } from '@workout/domain';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet } from 'react-native';

import { Chip } from '@/ui/Chip';
import { spacing } from '@/ui/theme';
import { useReducedMotion } from '@/ui/useReducedMotion';

import { recordBadgeAccessibilityLabel, recordBadgeLabel } from './recordBadgeLabel';

/**
 * A record badge (spec 0032): under a done set, or on an exercise for its
 * session volume. A notice only — never a stored record.
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
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const animate = pop && !reducedMotion;
  const scale = useRef(new Animated.Value(animate ? 0.6 : 1)).current;

  useEffect(() => {
    if (!animate) {
      return;
    }
    Animated.sequence([
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
    ]).start();
    // Once per mount, by design.
  }, []);

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

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingTop: spacing.xs,
  },
});
