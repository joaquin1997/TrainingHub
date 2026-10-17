import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { WeekVolumeComparison } from '@/features/progress/utils/weekComparison';
import { formatWeight, fromKg, roundWeight } from '@/lib/weight';
import { colors, commonStyles, createStyles, fontScaleCap, spacing, typeScale, useTheme } from '@/ui/theme';
import type { WeightUnit } from '@workout/domain';

interface WeekSummaryCardProps {
  comparison: WeekVolumeComparison;
  unit: WeightUnit;
}

/**
 * This week's volume against last week up to the same point (spec 0035
 * FR-11): the figure, the change in words with an arrow, and last week's
 * full total. With no workout last week there is no comparison.
 */
export function WeekSummaryCard({ comparison, unit }: WeekSummaryCardProps) {
  useTheme();
  const { t } = useTranslation();
  const shown = (kg: number) => roundWeight(fromKg(kg, unit));
  const delta = shown(comparison.thisWeekKg) - shown(comparison.lastWeekToDateKg);
  const amount = formatWeight(Math.abs(comparison.thisWeekKg - comparison.lastWeekToDateKg), unit);
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('progress.thisWeekVolume')}</Text>
      <Text maxFontSizeMultiplier={fontScaleCap.largeFigure} style={styles.figure}>
        {formatWeight(comparison.thisWeekKg, unit)}
      </Text>
      {comparison.hasLastWeek ? (
        <>
          <View style={styles.deltaRow}>
            <Ionicons
              name={direction === 'up' ? 'arrow-up' : direction === 'down' ? 'arrow-down' : 'remove'}
              size={16}
              color={direction === 'up' ? colors.success : colors.textMuted}
            />
            <Text style={[styles.delta, direction === 'up' ? styles.deltaUp : null]}>
              {direction === 'up'
                ? t('progress.volumeUp', { amount })
                : direction === 'down'
                  ? t('progress.volumeDown', { amount })
                  : t('progress.volumeSame')}
            </Text>
          </View>
          <Text style={styles.meta}>
            {t('progress.lastWeekTotal', { amount: formatWeight(comparison.lastWeekTotalKg, unit) })}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = createStyles(() => ({
  card: {
    ...commonStyles.card,
    gap: spacing.xs,
  },
  label: {
    ...commonStyles.sectionLabel,
  },
  figure: {
    ...typeScale.figureLarge,
    color: colors.text,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  delta: {
    ...typeScale.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  deltaUp: {
    color: colors.success,
  },
  meta: {
    ...commonStyles.meta,
  },
}));
