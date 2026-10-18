import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { EditableWarmUpItem } from '@/features/routines/utils/warmUpItems';
import { formatDuration } from '@/lib/format';
import { parseDurationInput } from '@/lib/tracking';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { colors, commonStyles, createStyles, fonts, keyboardAppearance, radii, spacing, useTheme } from '@/ui/theme';
import { CardHeader } from '@/ui/CardHeader';

type Props = {
  items: EditableWarmUpItem[];
  onChange: (items: EditableWarmUpItem[]) => void;
  createId: () => string;
};

/**
 * The routine's warm-up block in the editor (spec 0024 FR-5): an ordered list
 * of items, each a name and an optional time or reps target.
 */
export function WarmUpBlockEditor({ items, onChange, createId }: Props) {
  useTheme();
  const { t } = useTranslation();

  const update = (id: string, patch: Partial<EditableWarmUpItem>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  // A typed time reads as m:ss once the field is left, like set targets.
  const normaliseTime = (item: EditableWarmUpItem) => {
    if (item.targetKind !== 'time') {
      return;
    }
    const seconds = parseDurationInput(item.target);
    if (typeof seconds === 'number' && formatDuration(seconds) !== item.target) {
      update(item.id, { target: formatDuration(seconds) });
    }
  };

  return (
    <View style={styles.card}>
      <CardHeader icon="flame-outline" title={t('warmUp.title')} />
      <Text style={styles.meta}>{t('warmUp.hint')}</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <TextInput
            keyboardAppearance={keyboardAppearance()}
            value={item.name}
            onChangeText={(name) => update(item.id, { name })}
            placeholder={t('warmUp.itemPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, styles.nameInput]}
          />
          <TextInput
            keyboardAppearance={keyboardAppearance()}
            value={item.target}
            onChangeText={(target) => update(item.id, { target })}
            onBlur={() => normaliseTime(item)}
            placeholder={
              item.targetKind === 'time' ? t('warmUp.timePlaceholder') : t('warmUp.repsPlaceholder')
            }
            placeholderTextColor={colors.textSubtle}
            keyboardType={item.targetKind === 'time' ? 'numbers-and-punctuation' : 'number-pad'}
            style={[styles.input, styles.targetInput]}
          />
          <Chip
            size="sm"
            label={item.targetKind === 'time' ? t('warmUp.targetTime') : t('warmUp.targetReps')}
            onPress={() =>
              update(item.id, { targetKind: item.targetKind === 'time' ? 'reps' : 'time' })
            }
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('warmUp.removeItem')}
            onPress={() => onChange(items.filter((other) => other.id !== item.id))}
            hitSlop={6}
            style={styles.remove}
          >
            <Ionicons name="close" size={18} color={colors.textSubtle} />
          </Pressable>
        </View>
      ))}
      <Button
        label={t('warmUp.addItem')}
        icon="add"
        variant="ghost"
        onPress={() =>
          onChange([...items, { id: createId(), name: '', target: '', targetKind: 'time' }])
        }
        style={styles.addButton}
      />
    </View>
  );
}

const styles = createStyles(() => ({
  card: {
    ...commonStyles.card,
    gap: spacing.sm,
  },
  meta: {
    ...commonStyles.meta,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  input: {
    ...commonStyles.input,
    minHeight: 44,
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
  },
  targetInput: {
    width: 64,
    paddingHorizontal: spacing.xs,
    textAlign: 'center',
    fontFamily: fonts.displayBold,
    fontVariant: ['tabular-nums'],
  },
  remove: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  addButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
}));
