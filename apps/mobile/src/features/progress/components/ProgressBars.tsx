import { Text, View } from 'react-native';

import { barHeightRatio, type ChartSeries } from '@/features/progress/utils/chartData';
import { colors, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';

const CHART_AREA_HEIGHT = 120;

interface ProgressBarsProps {
  series: ChartSeries;
  /** Formats a bar's ISO date into a short axis label. */
  formatLabel: (date: string) => string;
  formatValue: (value: number) => string;
}

/**
 * The chart body as bars built from plain views: the fallback `ProgressChart`
 * draws when the installed binary has no native SVG view yet (spec 0034,
 * plan-b B2 "old binary guard"). Same look as before the line charts.
 */
export function ProgressBars({ series, formatLabel, formatValue }: ProgressBarsProps) {
  useTheme();
  return (
    <View style={styles.chart}>
      {series.points.map((bar, index) => {
        // The latest bar is the one that matters; the rest give context.
        const isLatest = index === series.points.length - 1;
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
                  {
                    height: Math.max(
                      2,
                      barHeightRatio(bar.value, series.min, series.max) * CHART_AREA_HEIGHT,
                    ),
                  },
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
  );
}

const styles = createStyles(() => ({
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
    color: colors.primaryInk,
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
    backgroundColor: colors.primaryInk,
  },
  label: {
    color: colors.textSubtle,
    ...typeScale.caption,
  },
  labelLatest: {
    color: colors.primaryInk,
    fontWeight: '700',
  },
}));
