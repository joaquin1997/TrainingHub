import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WorkoutSetType } from '@workout/domain';
import { Button } from '@/ui/Button';
import { colors, createStyles, radii, spacing, typeScale, useTheme } from '@/ui/theme';

export function SetTypeSheet({ selection, onSelect, onClose }: {
  selection: { type: WorkoutSetType; routine?: boolean } | null;
  onSelect: (type: WorkoutSetType) => void;
  onClose: () => void;
}) {
  useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const types: WorkoutSetType[] = selection?.routine ? ['normal', 'warmup'] : ['normal', 'warmup', 'drop', 'failure'];
  return (
    <Modal visible={selection !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable accessible={false} onPress={(event) => event.stopPropagation()} style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>{t('workouts.setTypePicker.title')}</Text>
            {types.map((type) => <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: selection?.type === type }}
              onPress={() => { onSelect(type); onClose(); }} style={[styles.option, selection?.type === type ? styles.selected : null]}>
              <View style={styles.heading}>
                <Text style={styles.name}>{t(`workouts.setType.${type}`)}</Text>
                {selection?.type === type ? <Text style={styles.description}>{t('workouts.setTypePicker.current')}</Text> : null}
              </View>
              <Text style={styles.description}>{t(`workouts.setTypePicker.${type}`)}</Text>
            </Pressable>)}
            <Button variant="secondary" label={t('common.cancel')} onPress={onClose} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const styles = createStyles(() => ({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, maxHeight: '85%', borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, ...typeScale.heading },
  option: { minHeight: 44, padding: spacing.md, gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm },
  selected: { borderColor: colors.accentInk, backgroundColor: colors.accentSoft },
  heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
  name: { color: colors.text, ...typeScale.body, fontWeight: '600' },
  description: { color: colors.textMuted, ...typeScale.caption },
}));
