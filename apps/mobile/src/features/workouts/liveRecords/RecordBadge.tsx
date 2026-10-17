import type { LiveRecordHit, WeightUnit } from '@workout/domain';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/ui/Chip';
import { spacing } from '@/ui/theme';

import { recordBadgeAccessibilityLabel, recordBadgeLabel } from './recordBadgeLabel';

/**
 * A record badge (spec 0032): under a done set, or on an exercise for its
 * session volume. A notice only — never a stored record.
 */
export function RecordBadge({ hits, unit }: { hits: LiveRecordHit[]; unit: WeightUnit }) {
  const { t } = useTranslation();

  return (
    <View
      style={styles.badge}
      accessible
      accessibilityLabel={recordBadgeAccessibilityLabel(hits, unit, t)}
    >
      <Chip tone="record" icon="trophy" size="sm" label={recordBadgeLabel(hits, unit, t)} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    paddingTop: spacing.xs,
  },
});
