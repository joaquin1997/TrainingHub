import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { supersetKind } from '@/features/routines/utils/supersetGroups';
import { Chip } from '@/ui/Chip';
import { spacing } from '@/ui/theme';

interface SupersetHeaderProps {
  /** How many exercises the group holds. */
  size: number;
  /** In the active workout: the round in progress, or null once all are done. */
  round?: { current: number | null; total: number };
}

/**
 * The head of a superset card (spec 0029 FR-12, FR-13): "Superset",
 * "Tri-set" or "Giant set" by size, and in the active workout "Round 2 of 4"
 * or "Complete". The same in the routine detail, the editor and the workout.
 */
export function SupersetHeader({ size, round }: SupersetHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <Chip icon="flash" label={t(`supersets.${supersetKind(size)}`)} size="sm" />
      {round && round.total > 0 ? (
        round.current === null ? (
          <Chip icon="checkmark" tone="done" label={t('supersets.complete')} size="sm" />
        ) : (
          <Chip
            tone="primary"
            label={t('supersets.roundOf', { current: round.current, total: round.total })}
            size="sm"
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
