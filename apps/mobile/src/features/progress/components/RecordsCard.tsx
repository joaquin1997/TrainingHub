import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { describeRecord } from '@/features/progress/utils/recordLabels';
import { colors, commonStyles, fonts, spacing } from '@/ui/theme';
import type { ExerciseRecord, WeightUnit } from '@workout/domain';

export interface RecordsCardItem {
  key: string;
  record: ExerciseRecord;
  /** Second line after the set, e.g. the date or the exercise name. */
  meta?: string;
}

interface RecordsCardProps {
  title: string;
  items: RecordsCardItem[];
  unit: WeightUnit;
}

/** A card of personal records (spec 0023): trophy, what it is, its figure. */
export function RecordsCard({ title, items, unit }: RecordsCardProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {items.map(({ key, record, meta }) => {
        const label = describeRecord(record, unit, t);
        const caption = [label.set, meta].filter(Boolean).join(' · ');

        return (
          <View key={key} style={styles.row}>
            <View style={styles.icon}>
              <Ionicons name="trophy" size={14} color={colors.accent} />
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>{label.title}</Text>
              {caption ? <Text style={styles.caption}>{caption}</Text> : null}
            </View>
            <Text style={styles.value}>{label.value}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...commonStyles.card,
  },
  cardTitle: {
    ...commonStyles.cardTitle,
    marginBottom: spacing.xs,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  caption: {
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  value: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});
