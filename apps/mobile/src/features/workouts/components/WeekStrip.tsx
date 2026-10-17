import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { sameDay } from '@/lib/week';
import { colors, createStyles, fonts, fontScaleCap, radii, spacing, typeScale, useTheme } from '@/ui/theme';

interface WeekStripProps {
  /** Monday to Sunday of the current week. */
  days: Date[];
  today: Date;
  /** Workouts started on each day, same order as `days`. */
  counts: number[];
  selected: Date | null;
  onSelect: (day: Date | null) => void;
}

/**
 * The current week above History (spec 0035 FR-8, FR-9): weekday initial,
 * date and a dot on days with a workout; today outlined, the selected day
 * filled lime. Tapping the selected day again clears the filter; days after
 * today cannot be tapped.
 */
export function WeekStrip({ days, today, counts, selected, onSelect }: WeekStripProps) {
  useTheme();
  const { t, i18n } = useTranslation();

  return (
    <View accessibilityRole="tablist" accessibilityLabel={t('workouts.weekStripLabel')} style={styles.strip}>
      {days.map((day, index) => {
        const isToday = sameDay(day, today);
        const isSelected = selected !== null && sameDay(day, selected);
        const isFuture = day.getTime() > today.getTime() && !isToday;
        const count = counts[index] ?? 0;
        const weekday = day.toLocaleDateString(i18n.language, { weekday: 'long' });
        const label = [
          t('workouts.weekStripDay', { day: weekday, count }),
          isToday ? t('workouts.weekStripToday') : null,
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <Pressable
            key={day.toISOString()}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isSelected, disabled: isFuture }}
            disabled={isFuture}
            onPress={() => onSelect(isSelected ? null : day)}
            style={[
              styles.day,
              isToday ? styles.today : null,
              isSelected ? styles.selected : null,
              isFuture ? styles.future : null,
            ]}
          >
            <Text
              maxFontSizeMultiplier={fontScaleCap.fixedColumn}
              style={[styles.initial, isSelected ? styles.onSelected : null]}
            >
              {day.toLocaleDateString(i18n.language, { weekday: 'narrow' })}
            </Text>
            <Text
              maxFontSizeMultiplier={fontScaleCap.fixedColumn}
              style={[styles.date, isSelected ? styles.onSelected : null]}
            >
              {day.getDate()}
            </Text>
            <View
              style={[
                styles.dot,
                count > 0 ? (isSelected ? styles.dotOnSelected : styles.dotOn) : null,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = createStyles(() => ({
  strip: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  day: {
    flex: 1,
    minHeight: 64,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  today: {
    borderColor: colors.primary,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  future: {
    opacity: 0.45,
  },
  initial: {
    ...typeScale.caption,
    color: colors.textMuted,
  },
  date: {
    ...typeScale.body,
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontVariant: ['tabular-nums'],
  },
  onSelected: {
    color: colors.onPrimary,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.round,
  },
  dotOn: {
    backgroundColor: colors.primary,
  },
  dotOnSelected: {
    backgroundColor: colors.onPrimary,
  },
}));
