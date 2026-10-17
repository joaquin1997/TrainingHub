import { StyleSheet, Text, View } from 'react-native';

import type { ChartSeries } from '@/features/progress/utils/chartData';
import { colors, commonStyles, fonts, radii, spacing, typeScale } from '@/ui/theme';

const CHART_AREA_HEIGHT = 120;

interface ProgressChartProps {
  title: string;
  unit?: string;
  series: ChartSeries;
  /** Formats a bar's ISO date into a short axis label. */
  formatLabel: (date: string) => string;
  /** Formats bar values and the range; whole numbers by default. */
  formatValue?: (value: number) => string;
}

const roundValue = (value: number) => String(Math.round(value));

/**
 * Minimal bar chart built from plain views (no native chart dependency) so it
 * renders the same on iOS, Android and web. Bars are pre-scaled by the caller.
 */
export function ProgressChart({
  title,
  unit,
  series,
  formatLabel,
  formatValue = roundValue,
}: ProgressChartProps) {
  if (series.bars.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.range}>
          {formatValue(series.min)}
          {series.min !== series.max ? `-${formatValue(series.max)}` : ''}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>
      <View style={styles.chart}>
        {series.bars.map((bar, index) => {
          // The latest bar is the one that matters; the rest give context.
          const isLatest = index === series.bars.length - 1;
          return (
            <View key={`${bar.date}-${index}`} style={styles.column}>
              <Text numberOfLines={1} style={[styles.value, isLatest ? styles.valueLatest : null]}>
                {formatValue(bar.value)}
              </Text>
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    isLatest ? styles.barLatest : null,
                    { height: Math.max(2, bar.heightRatio * CHART_AREA_HEIGHT) },
                  ]}
                />
              </View>
              <Text numberOfLines={1} style={[styles.label, isLatest ? styles.labelLatest : null]}>
                {formatLabel(bar.date)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  title: {
    ...commonStyles.cardTitle,
    flexShrink: 1,
  },
  range: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
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
    color: colors.textSubtle,
    fontFamily: fonts.display,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
  valueLatest: {
    color: colors.primary,
  },
  track: {
    height: CHART_AREA_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '72%',
    minWidth: 6,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
    backgroundColor: colors.borderStrong,
  },
  barLatest: {
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.textSubtle,
    ...typeScale.caption,
  },
  labelLatest: {
    color: colors.primary,
    fontWeight: '700',
  },
});
