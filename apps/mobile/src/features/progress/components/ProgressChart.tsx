import { StyleSheet, Text, View } from 'react-native';

import type { ChartSeries } from '@/features/progress/utils/chartData';
import { colors, radii, spacing } from '@/ui/theme';

const CHART_AREA_HEIGHT = 120;

interface ProgressChartProps {
  title: string;
  unit?: string;
  series: ChartSeries;
  /** Formats a bar's ISO date into a short axis label. */
  formatLabel: (date: string) => string;
}

/**
 * Minimal bar chart built from plain views (no native chart dependency) so it
 * renders the same on iOS, Android and web. Bars are pre-scaled by the caller.
 */
export function ProgressChart({
  title,
  unit,
  series,
  formatLabel,
}: ProgressChartProps) {
  if (series.bars.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.range}>
          {Math.round(series.min)}
          {series.min !== series.max ? `-${Math.round(series.max)}` : ''}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>
      <View style={styles.chart}>
        {series.bars.map((bar, index) => (
          <View key={`${bar.date}-${index}`} style={styles.column}>
            <Text numberOfLines={1} style={styles.value}>
              {Math.round(bar.value)}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(2, bar.heightRatio * CHART_AREA_HEIGHT) },
                ]}
              />
            </View>
            <Text numberOfLines={1} style={styles.label}>
              {formatLabel(bar.date)}
            </Text>
          </View>
        ))}
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  range: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  track: {
    height: CHART_AREA_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    minWidth: 6,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.textSubtle,
    fontSize: 10,
  },
});
