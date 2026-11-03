import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { sameDay } from '@/lib/week';
import { colors, createStyles, fonts, fontScaleCap, radii, spacing, typeScale, useTheme } from '@/ui/theme';

interface WeekStripProps {
  /** Monday to Sunday of the week shown. */
  days: Date[];
  /** The week shown in words: "This week", "Last week" or its dates. */
  weekLabel: string;
  /** Earlier and later weeks (spec 0040 FR-9); absent when there is none to go to. */
  onPrevious?: () => void;
  onNext?: () => void;
  today: Date;
  /** Workouts started on each day, same order as `days`. */
  counts: number[];
  selected: Date | null;
  onSelect: (day: Date | null) => void;
}

/**
 * A week above History (spec 0035 FR-8, FR-9): weekday initial, date and a
 * dot on days with a workout; today outlined, the selected day filled lime.
 * Tapping the selected day again clears the filter; days after today cannot
 * be tapped. Arrows move to the week before or after (spec 0040 FR-9).
 */
export function WeekStrip({
  days,
  weekLabel,
  onPrevious,
  onNext,
  today,
  counts,
  selected,
  onSelect,
}: WeekStripProps) {
  useTheme();
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workouts.previousWeek')}
          accessibilityState={{ disabled: !onPrevious }}
          disabled={!onPrevious}
          onPress={onPrevious}
          hitSlop={NAV_HIT}
          style={[styles.navButton, onPrevious ? null : styles.navDisabled]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.navLabel}>
          {weekLabel}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workouts.nextWeek')}
          accessibilityState={{ disabled: !onNext }}
          disabled={!onNext}
          onPress={onNext}
          hitSlop={NAV_HIT}
          style={[styles.navButton, onNext ? null : styles.navDisabled]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>
      <View accessibilityRole="tablist" accessibilityLabel={weekLabel} style={styles.strip}>
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
    </View>
  );
}

/** The arrows reach 44 pt (spec 0034 FR-19). */
const NAV_HIT = { top: 6, bottom: 6, left: 6, right: 6 };

const styles = createStyles(() => ({
  container: {
    gap: spacing.sm,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  navDisabled: {
    opacity: 0.3,
  },
  navLabel: {
    ...typeScale.caption,
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
  },
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
    borderColor: colors.primaryInk,
  },
  selected: {
    borderColor: colors.primaryInk,
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
    backgroundColor: colors.primaryInk,
  },
  dotOnSelected: {
    backgroundColor: colors.onPrimary,
  },
}));
