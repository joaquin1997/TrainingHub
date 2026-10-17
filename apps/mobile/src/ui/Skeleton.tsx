import { createContext, type ReactNode, useContext, useEffect, useRef } from 'react';
import { Animated, type DimensionValue, StyleSheet, View } from 'react-native';

import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import { useReducedMotion } from '@/ui/useReducedMotion';

/**
 * Skeleton loading (spec 0034 FR-15): neutral shapes laid out like the content
 * to come, pulsing together; still under Reduce Motion. Shapes only — never a
 * number or a name.
 */
const PulseContext = createContext<Animated.Value | null>(null);

function SkeletonGroup({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduced]);

  return (
    <PulseContext.Provider value={opacity}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true }}
        style={styles.group}
      >
        {children}
      </View>
    </PulseContext.Provider>
  );
}

interface BlockProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
  /** Takes the free space of a row. */
  grow?: boolean;
}

export function SkeletonBlock({ width = '100%', height, radius = radii.sm, grow = false }: BlockProps) {
  const opacity = useContext(PulseContext);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius },
        grow ? styles.grow : null,
        opacity ? { opacity } : null,
      ]}
    />
  );
}

/** Card with a title line, a meta line, a row of chips and a button: routines, history. */
export function SkeletonCardList({ count = 3, withButton = false }: { count?: number; withButton?: boolean }) {
  return (
    <SkeletonGroup>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.card}>
          <SkeletonBlock width="60%" height={22} />
          <SkeletonBlock width="35%" height={14} />
          <View style={styles.row}>
            <SkeletonBlock width={88} height={24} radius={radii.pill} />
            <SkeletonBlock width={104} height={24} radius={radii.pill} />
            <SkeletonBlock width={72} height={24} radius={radii.pill} />
          </View>
          {withButton ? <SkeletonBlock height={48} radius={radii.md} /> : null}
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Rows with a thumbnail and two lines: the exercise list. */
export function SkeletonRowList({ count = 6 }: { count?: number }) {
  return (
    <SkeletonGroup>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.card, styles.rowCard]}>
          <SkeletonBlock width={48} height={48} radius={radii.md} />
          <View style={styles.lines}>
            <SkeletonBlock width="70%" height={16} />
            <SkeletonBlock width="45%" height={13} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Stat tiles, a chart and exercise cards: the progress overview. */
export function SkeletonProgress() {
  return (
    <SkeletonGroup>
      {[0, 1].map((row) => (
        <View key={row} style={styles.row}>
          <View style={[styles.card, styles.tile]}>
            <SkeletonBlock width="70%" height={13} />
            <SkeletonBlock width="35%" height={26} />
          </View>
          <View style={[styles.card, styles.tile]}>
            <SkeletonBlock width="70%" height={13} />
            <SkeletonBlock width="35%" height={26} />
          </View>
        </View>
      ))}
      <View style={styles.card}>
        <SkeletonBlock width="50%" height={22} />
        <SkeletonBlock height={140} radius={radii.md} />
      </View>
      <View style={styles.card}>
        <SkeletonBlock width="55%" height={22} />
        <SkeletonBlock width="80%" height={14} />
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.md,
  },
  block: {
    backgroundColor: colors.surfaceRaised,
  },
  grow: {
    flex: 1,
  },
  card: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  lines: {
    flex: 1,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    padding: spacing.md,
  },
});
