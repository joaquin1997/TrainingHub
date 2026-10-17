import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatWarmUpTarget } from '@/features/routines/utils/warmUpItems';
import { colors, commonStyles, spacing, typeScale } from '@/ui/theme';
import { CardHeader } from '@/ui/CardHeader';

type Item = {
  key: string;
  name: string;
  targetDurationSeconds?: number;
  targetReps?: number;
  /** Absent for the routine's plan, where nothing is ticked yet. */
  done?: boolean;
};

type Props = {
  items: Item[];
  /** Makes each row a checkbox (active workout, spec 0024 FR-6). */
  onToggle?: (key: string) => void;
};

/**
 * The warm-up block as a card (spec 0024): the routine's plan, the active
 * workout's checklist, or what a saved workout ticked. Never sets.
 */
export function WarmUpChecklist({ items, onToggle }: Props) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <CardHeader icon="flame-outline" title={t('warmUp.title')} />
      {items.map((item) => {
        const target = formatWarmUpTarget(item);
        const icon =
          item.done === undefined ? 'ellipse' : item.done ? 'checkmark-circle' : 'ellipse-outline';
        const content = (
          <>
            <Ionicons
              name={icon}
              size={item.done === undefined ? 8 : 24}
              color={item.done ? colors.success : colors.textMuted}
              accessibilityLabel={
                item.done === undefined ? undefined : item.done ? t('warmUp.done') : t('warmUp.notDone')
              }
            />
            <Text style={[styles.name, item.done ? styles.nameDone : null]}>{item.name}</Text>
            {target ? <Text style={styles.target}>{target}</Text> : null}
          </>
        );

        return onToggle ? (
          <Pressable
            key={item.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: Boolean(item.done) }}
            onPress={() => onToggle(item.key)}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
          >
            {content}
          </Pressable>
        ) : (
          <View key={item.key} style={styles.row}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...commonStyles.card,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 36,
  },
  pressed: {
    ...commonStyles.pressed,
  },
  name: {
    flex: 1,
    color: colors.text,
    ...typeScale.body,
  },
  nameDone: {
    color: colors.textMuted,
  },
  target: {
    color: colors.textMuted,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
});
