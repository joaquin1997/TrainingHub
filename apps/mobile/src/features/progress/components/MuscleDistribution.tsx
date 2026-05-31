import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/ui/theme';
import type { MuscleGroupVolumePoint } from '@workout/domain';

interface MuscleDistributionProps {
  points: MuscleGroupVolumePoint[];
}

/** Horizontal volume-by-muscle-group bars (proportional to the top group). */
export function MuscleDistribution({ points }: MuscleDistributionProps) {
  if (points.length === 0) {
    return null;
  }

  const max = Math.max(...points.map((point) => point.totalVolume));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Volume by muscle group</Text>
      {points.map((point) => (
        <View key={point.group} style={styles.row}>
          <Text numberOfLines={1} style={styles.label}>
            {point.group}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                { width: `${Math.max(4, (point.totalVolume / max) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.value}>{point.totalVolume}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    width: 72,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  value: {
    width: 56,
    textAlign: 'right',
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
