import type { WeightUnit } from '@workout/domain';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { RecordRow } from './RecordsCard';
import type { SessionRecordGroup } from '../utils/groupSessionRecords';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/ui/Button';
import { colors, commonStyles, createStyles, spacing, typeScale, useTheme } from '@/ui/theme';

export function GroupedRecordsCard({ title, groups, unit, highlight = false, onPressWorkout }: {
  title: string; groups: SessionRecordGroup[]; unit: WeightUnit; highlight?: boolean; onPressWorkout?: () => void;
}) {
  useTheme();
  const { t, i18n } = useTranslation();
  if (!groups.length) return null;
  return <View style={[styles.card, highlight ? styles.highlight : null]}>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {groups.map((group) => <View key={group.exerciseId} style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>{group.exerciseName}</Text>
      <Text style={styles.count}>{t('progress.records.count', { count: group.records.length })}</Text>
      {group.records.map((record, index) => <RecordRow key={`${record.type}-${index}`} record={record}
        meta={formatDateTime(record.date, i18n.language)} unit={unit} stacked accessible />)}
    </View>)}
    {onPressWorkout ? <Button label={t('progress.records.viewWorkout')} variant="secondary" onPress={onPressWorkout} fullWidth /> : null}
  </View>;
}
const styles = createStyles(() => ({
  card: { ...commonStyles.card, gap: spacing.md },
  highlight: { borderColor: colors.accentInk, backgroundColor: colors.accentSoft },
  title: { ...typeScale.heading, color: colors.text },
  heading: { ...typeScale.body, fontWeight: '700', color: colors.text },
  count: { ...typeScale.caption, color: colors.textMuted },
  group: { gap: spacing.xs },
}));
