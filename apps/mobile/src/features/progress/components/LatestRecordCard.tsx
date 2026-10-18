import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { describeRecord } from '@/features/progress/utils/recordLabels';
import { formatDate } from '@/lib/format';
import { colors, commonStyles, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';
import type { SessionRecord, WeightUnit } from '@workout/domain';

interface LatestRecordCardProps {
  record: SessionRecord;
  unit: WeightUnit;
  onPress: () => void;
}

/**
 * The most recent personal record of any exercise (spec 0035 FR-11):
 * exercise, record type, value in the display unit and date; opens that
 * exercise's progress.
 */
export function LatestRecordCard({ record, unit, onPress }: LatestRecordCardProps) {
  useTheme();
  const { t, i18n } = useTranslation();
  const label = describeRecord(record, unit, t);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? commonStyles.pressed : null]}
    >
      <View style={styles.icon}>
        <Ionicons name="trophy" size={18} color={colors.accentInk} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{t('progress.latestRecord')}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {record.exerciseName}
        </Text>
        <Text style={styles.meta}>
          {[label.title, formatDate(record.date, i18n.language)].join(' · ')}
        </Text>
      </View>
      <Text style={styles.value}>{label.value}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = createStyles(() => ({
  card: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.accentSoft,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  label: {
    ...commonStyles.sectionLabel,
  },
  title: {
    ...commonStyles.cardTitle,
  },
  meta: {
    ...commonStyles.meta,
  },
  value: {
    ...typeScale.body,
    color: colors.accentInk,
    fontFamily: fonts.displayBold,
    fontVariant: ['tabular-nums'],
  },
}));
