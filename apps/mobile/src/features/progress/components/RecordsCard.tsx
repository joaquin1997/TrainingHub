import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { describeRecord } from '@/features/progress/utils/recordLabels';
import { colors, commonStyles, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';
import { CardHeader } from '@/ui/CardHeader';
import type { ExerciseRecord, WeightUnit } from '@workout/domain';

export interface RecordsCardItem {
  key: string;
  record: ExerciseRecord;
  /** Second line after the set, e.g. the date or the exercise name. */
  meta?: string;
}

interface RecordsCardProps {
  title: string;
  /** Keep long values below their label on narrow exercise detail screens. */
  stacked?: boolean;
  items: RecordsCardItem[];
  unit: WeightUnit;
  /**
   * `highlight` sets the card apart as the first thing of a screen (the
   * summary's records of the day, spec 0034 FR-24): orange tint and edge.
   */
  variant?: 'default' | 'highlight';
}

/** A card of personal records (spec 0023): trophy, what it is, its figure. */
export function RecordsCard({ title, items, unit, variant = 'default', stacked = false }: RecordsCardProps) {
  useTheme();
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={[styles.card, variant === 'highlight' ? styles.highlight : null]}>
      <CardHeader title={title} />
      {items.map(({ key, record, meta }) => <RecordRow key={key} record={record} meta={meta} unit={unit} stacked={stacked} />)}
    </View>
  );
}

/** Shared record row: grouped summaries stack values for narrow/large-text layouts. */
export function RecordRow({ record, meta, unit, stacked = false, accessible = false }: {
  record: ExerciseRecord; meta?: string; unit: WeightUnit; stacked?: boolean; accessible?: boolean;
}) {
  useTheme();
  const { t } = useTranslation();
  const label = describeRecord(record, unit, t);
  const caption = [label.set, meta].filter(Boolean).join(' · ');
  return <View style={styles.row} accessible={accessible}
    accessibilityLabel={accessible ? [label.title, label.value, caption].filter(Boolean).join(', ') : undefined}>
    <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Ionicons name="trophy" size={14} color={colors.accentInk} />
    </View>
    <View style={styles.text}>
      <Text style={styles.title}>{label.title}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      {stacked ? <Text style={styles.value}>{label.value}</Text> : null}
    </View>
    {!stacked ? <Text style={styles.value}>{label.value}</Text> : null}
  </View>;
}

const styles = createStyles(() => ({
  card: {
    ...commonStyles.card,
  },
  highlight: {
    borderColor: colors.accentInk,
    backgroundColor: colors.accentSoft,
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
    borderRadius: radii.round,
    backgroundColor: colors.accentSoft,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  title: {
    color: colors.text,
    ...typeScale.caption,
    fontWeight: '600',
  },
  caption: {
    color: colors.textMuted,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
  value: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    ...typeScale.body,
    fontVariant: ['tabular-nums'],
  },
}));
