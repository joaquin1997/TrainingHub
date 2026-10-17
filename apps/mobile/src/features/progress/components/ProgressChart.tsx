import { useId, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, UIManager, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { ProgressBars } from '@/features/progress/components/ProgressBars';
import type { ChartSeries } from '@/features/progress/utils/chartData';
import { areaPath, layoutPoints, monotonePath } from '@/features/progress/utils/linePath';
import { canDrawSvg } from '@/features/progress/utils/svgSupport';
import { CardHeader } from '@/ui/CardHeader';
import { colors, commonStyles, fonts, spacing, typeScale } from '@/ui/theme';

/** Height of the plot (not a type, radius or spacing size: no token). */
const PLOT_HEIGHT = 140;
/** Room around the plot so the end dots and the record rings are not clipped. */
const PLOT_INSET = 8;
const LINE_WIDTH = 2.5;
const DOT_RADIUS = 3.5;
const RECORD_RADIUS = 5;
const DOT_RING = 2;
/** The area fades from this opacity of `primary` under the line to nothing. */
const AREA_OPACITY = 0.28;

// Decided once: the binary does not change while the app runs.
const SVG_AVAILABLE = canDrawSvg(Platform.OS, UIManager);

interface ProgressChartProps {
  title: string;
  unit?: string;
  series: ChartSeries;
  /** Formats a point's ISO date into a short axis label. */
  formatLabel: (date: string) => string;
  /** Formats values and the range; whole numbers by default. */
  formatValue?: (value: number) => string;
}

const roundValue = (value: number) => String(Math.round(value));

/**
 * A trend chart (spec 0034 FR-22): a smooth monotone line with a soft area
 * under it, one dot per point, records in orange, the first and last dates
 * under it and the min and max at its left edge. One point is a single dot
 * and no line (AC-16). Falls back to bars when the native SVG view is not in
 * the installed binary.
 */
export function ProgressChart({
  title,
  unit,
  series,
  formatLabel,
  formatValue = roundValue,
}: ProgressChartProps) {
  if (series.points.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <CardHeader
        title={title}
        trailing={
          <Text style={styles.range}>
            {formatValue(series.min)}
            {series.min !== series.max ? `-${formatValue(series.max)}` : ''}
            {unit ? ` ${unit}` : ''}
          </Text>
        }
      />
      {SVG_AVAILABLE ? (
        <LineChart series={series} formatLabel={formatLabel} formatValue={formatValue} />
      ) : (
        <ProgressBars series={series} formatLabel={formatLabel} formatValue={formatValue} />
      )}
    </View>
  );
}

function LineChart({
  series,
  formatLabel,
  formatValue,
}: {
  series: ChartSeries;
  formatLabel: (date: string) => string;
  formatValue: (value: number) => string;
}) {
  const [width, setWidth] = useState(0);
  // SVG ids are global on web: one gradient id per chart.
  const gradientId = `area-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const plotted = useMemo(
    () =>
      layoutPoints(series.points, {
        width,
        height: PLOT_HEIGHT,
        insetX: PLOT_INSET,
        insetY: PLOT_INSET,
      }),
    [series.points, width],
  );
  const line = useMemo(() => monotonePath(plotted), [plotted]);
  const area = useMemo(() => areaPath(plotted, PLOT_HEIGHT), [plotted]);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(Math.round(event.nativeEvent.layout.width));
  };

  const first = series.points[0]!;
  const last = series.points[series.points.length - 1]!;
  const single = series.points.length === 1;
  const flat = series.min === series.max;

  return (
    <View style={styles.body}>
      {/* A flat series (one point, or all equal) sits at mid-height: so does its value. */}
      <View style={[styles.yAxis, flat ? styles.yAxisFlat : null]}>
        <Text numberOfLines={1} style={styles.axisValue}>
          {formatValue(series.max)}
        </Text>
        {!flat ? (
          <Text numberOfLines={1} style={styles.axisValue}>
            {formatValue(series.min)}
          </Text>
        ) : null}
      </View>
      <View style={styles.plotColumn}>
        <View style={styles.plot} onLayout={onLayout}>
          {width > 0 ? (
            <Svg width={width} height={PLOT_HEIGHT}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.primary} stopOpacity={AREA_OPACITY} />
                  <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {area ? <Path d={area} fill={`url(#${gradientId})`} /> : null}
              {line ? (
                <Path
                  d={line}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={LINE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {plotted.map((point, index) => {
                const isRecord = series.points[index]!.isRecord;
                return (
                  <Circle
                    key={`${series.points[index]!.date}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={isRecord ? RECORD_RADIUS : DOT_RADIUS}
                    fill={isRecord ? colors.accent : colors.primary}
                    stroke={colors.surface}
                    strokeWidth={DOT_RING}
                  />
                );
              })}
            </Svg>
          ) : null}
        </View>
        <View style={[styles.xAxis, single ? styles.xAxisSingle : null]}>
          <Text numberOfLines={1} style={styles.axisDate}>
            {formatLabel(first.date)}
          </Text>
          {single ? null : (
            <Text numberOfLines={1} style={styles.axisDate}>
              {formatLabel(last.date)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.card,
    gap: spacing.md,
  },
  range: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
  body: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  plotColumn: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  yAxis: {
    height: PLOT_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.xxs,
  },
  yAxisFlat: {
    justifyContent: 'center',
  },
  axisValue: {
    color: colors.textSubtle,
    fontFamily: fonts.display,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
  plot: {
    height: PLOT_HEIGHT,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xAxisSingle: {
    justifyContent: 'center',
  },
  axisDate: {
    color: colors.textMuted,
    ...typeScale.caption,
  },
});
