import { Ionicons } from '@expo/vector-icons';
import { useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { ProgressBars } from '@/features/progress/components/ProgressBars';
import {
  pointLabel,
  pointReadout,
  type ChartSeries,
  type PointFormat,
} from '@/features/progress/utils/chartData';
import {
  areaPath,
  layoutPoints,
  monotonePath,
  nearestIndex,
  type PlotPoint,
} from '@/features/progress/utils/linePath';
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
/** A selected point grows by this much. */
const SELECTED_GROWTH = 2;
const DOT_RING = 2;
const GUIDE_WIDTH = 1;
/** The area fades from this opacity of `primary` under the line to nothing. */
const AREA_OPACITY = 0.28;
const RECORD_ICON = 12;

// Decided once: the binary does not change while the app runs.
const SVG_AVAILABLE = canDrawSvg(Platform.OS, UIManager);

interface ProgressChartProps {
  title: string;
  unit?: string;
  series: ChartSeries;
  /** Formats a point's ISO date into a short axis label (also the readout's date). */
  formatLabel: (date: string) => string;
  /** Formats values, the range and the readout; whole numbers by default. */
  formatValue?: (value: number) => string;
}

const roundValue = (value: number) => String(Math.round(value));

/**
 * A trend chart (spec 0034 FR-22): a smooth monotone line with a soft area
 * under it, one dot per point, records in orange, the first and last dates
 * under it and the min and max at its left edge. Touching or dragging over it
 * selects the nearest point and its date and value replace the range in the
 * header; a screen reader reaches every point in order. One point is a single
 * dot and no line (AC-16). Falls back to bars when the native SVG view is not
 * in the installed binary.
 */
export function ProgressChart({
  title,
  unit,
  series,
  formatLabel,
  formatValue = roundValue,
}: ProgressChartProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);

  if (series.points.length === 0) {
    return null;
  }

  const format: PointFormat = { formatDate: formatLabel, formatValue, unit };
  // A refresh can shorten the series under a selection: drop it then.
  const point = selected === null ? undefined : series.points[selected];

  return (
    <View style={styles.container}>
      <CardHeader
        title={title}
        trailing={
          point ? (
            <View style={styles.readout} accessibilityLiveRegion="polite">
              {point.isRecord ? (
                <Ionicons name="trophy" size={RECORD_ICON} color={colors.accent} />
              ) : null}
              <Text style={[styles.range, styles.readoutText]}>
                {pointReadout(point, format, t)}
                {point.isRecord ? (
                  <Text style={styles.readoutRecord}>{` · ${t('progress.chart.record')}`}</Text>
                ) : null}
              </Text>
            </View>
          ) : (
            <Text style={styles.range}>
              {formatValue(series.min)}
              {series.min !== series.max ? `-${formatValue(series.max)}` : ''}
              {unit ? ` ${unit}` : ''}
            </Text>
          )
        }
      />
      {SVG_AVAILABLE ? (
        <LineChart
          series={series}
          format={format}
          selected={point ? selected : null}
          onSelect={setSelected}
        />
      ) : (
        <ProgressBars series={series} formatLabel={formatLabel} formatValue={formatValue} />
      )}
    </View>
  );
}

function LineChart({
  series,
  format,
  selected,
  onSelect,
}: {
  series: ChartSeries;
  format: PointFormat;
  selected: number | null;
  onSelect: (index: number | null) => void;
}) {
  const { t } = useTranslation();
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

  // The responder is made once; it reads the latest points and selection here.
  const latest = useRef({ plotted, selected, onSelect });
  latest.current = { plotted, selected, onSelect };
  const gesture = useRef({ moved: false, wasSelected: false });

  const panResponder = useMemo(() => {
    const pick = (event: GestureResponderEvent) =>
      nearestIndex(latest.current.plotted, event.nativeEvent.locationX);

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const index = pick(event);
        gesture.current = { moved: false, wasSelected: index === latest.current.selected };
        if (index >= 0) {
          latest.current.onSelect(index);
        }
      },
      onPanResponderMove: (event) => {
        const index = pick(event);
        gesture.current.moved = true;
        if (index >= 0 && index !== latest.current.selected) {
          latest.current.onSelect(index);
        }
      },
      onPanResponderRelease: () => {
        // A tap on the point already selected clears it; a drag keeps its point.
        if (!gesture.current.moved && gesture.current.wasSelected) {
          latest.current.onSelect(null);
        }
      },
      // Vertical scrolling may take over; the selection stays.
      onPanResponderTerminationRequest: () => true,
    });
  }, []);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(Math.round(event.nativeEvent.layout.width));
  };

  const first = series.points[0]!;
  const last = series.points[series.points.length - 1]!;
  const single = series.points.length === 1;
  const flat = series.min === series.max;
  const guide: PlotPoint | undefined = selected === null ? undefined : plotted[selected];

  return (
    // A tap beside the plot (axes, dates) clears the selection; the plot's own
    // touch layer answers first, so this only sees taps outside it.
    <View
      style={styles.body}
      onStartShouldSetResponder={() => selected !== null}
      onResponderRelease={() => onSelect(null)}
    >
      {/* A flat series (one point, or all equal) sits at mid-height: so does its value. */}
      <View
        style={[styles.yAxis, flat ? styles.yAxisFlat : null]}
        aria-hidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text numberOfLines={1} style={styles.axisValue}>
          {format.formatValue(series.max)}
        </Text>
        {!flat ? (
          <Text numberOfLines={1} style={styles.axisValue}>
            {format.formatValue(series.min)}
          </Text>
        ) : null}
      </View>
      <View style={styles.plotColumn}>
        <View style={styles.plot} onLayout={onLayout} testID="progress-chart-plot">
          {width > 0 ? (
            <>
              <View
                style={StyleSheet.absoluteFill}
                aria-hidden
                importantForAccessibility="no-hide-descendants"
              >
                <Svg width={width} height={PLOT_HEIGHT}>
                  <Defs>
                    <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={colors.primary} stopOpacity={AREA_OPACITY} />
                      <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  {area ? <Path d={area} fill={`url(#${gradientId})`} /> : null}
                  {guide ? (
                    <Line
                      x1={guide.x}
                      y1={0}
                      x2={guide.x}
                      y2={PLOT_HEIGHT}
                      stroke={colors.borderStrong}
                      strokeWidth={GUIDE_WIDTH}
                    />
                  ) : null}
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
                  {plotted.map((plot, index) => {
                    const isRecord = series.points[index]!.isRecord;
                    const radius =
                      (isRecord ? RECORD_RADIUS : DOT_RADIUS) +
                      (index === selected ? SELECTED_GROWTH : 0);
                    return (
                      <Circle
                        key={`${series.points[index]!.date}-${index}`}
                        cx={plot.x}
                        cy={plot.y}
                        r={radius}
                        fill={isRecord ? colors.accent : colors.primary}
                        stroke={colors.surface}
                        strokeWidth={DOT_RING}
                      />
                    );
                  })}
                </Svg>
              </View>
              {/*
                One accessible column per point, in order (FR-22, AC-15): what
                VoiceOver and TalkBack swipe through. They sit under the touch
                layer, which serves fingers and the mouse only.
              */}
              {series.points.map((entry, index) => {
                const left = index === 0 ? 0 : (plotted[index - 1]!.x + plotted[index]!.x) / 2;
                const right =
                  index === plotted.length - 1
                    ? width
                    : (plotted[index]!.x + plotted[index + 1]!.x) / 2;
                return (
                  <View
                    key={`a11y-${entry.date}-${index}`}
                    testID="progress-chart-point"
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={pointLabel(entry, format, t)}
                    accessibilityState={{ selected: index === selected }}
                    onAccessibilityTap={() => onSelect(index)}
                    style={[styles.pointColumn, { left, width: Math.max(0, right - left) }]}
                  />
                );
              })}
              <View
                style={StyleSheet.absoluteFill}
                aria-hidden
                importantForAccessibility="no-hide-descendants"
                {...panResponder.panHandlers}
              />
            </>
          ) : null}
        </View>
        <View
          style={[styles.xAxis, single ? styles.xAxisSingle : null]}
          aria-hidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text numberOfLines={1} style={styles.axisDate}>
            {format.formatDate(first.date)}
          </Text>
          {single ? null : (
            <Text numberOfLines={1} style={styles.axisDate}>
              {format.formatDate(last.date)}
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
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  readoutText: {
    color: colors.text,
  },
  readoutRecord: {
    color: colors.accent,
  },
  body: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  plotColumn: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  plot: {
    height: PLOT_HEIGHT,
  },
  pointColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
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
