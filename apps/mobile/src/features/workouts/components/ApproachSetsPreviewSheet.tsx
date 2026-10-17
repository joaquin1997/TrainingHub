import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WeightUnit } from '@workout/domain';

import type { ApproachSet } from '@/lib/approachSets';
import { Button } from '@/ui/Button';
import { colors, fonts, radii, spacing } from '@/ui/theme';

export type ApproachSetsPreviewContent = {
  exerciseName: string;
  /** Lightest first, in the display unit. */
  sets: ApproachSet[];
  workingWeight: number;
  unit: WeightUnit;
  /** Warm-up sets (or rows) already there, which stay (spec 0031 FR-4). */
  keptWarmUps: number;
};

interface ApproachSetsPreviewSheetProps {
  /** What adding would do; `null` hides the sheet. */
  preview: ApproachSetsPreviewContent | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shows the approach sets the warm-up action would add before anything
 * changes (spec 0031 FR-1): each set lightest first, the working weight they
 * come from, and that warm-ups already there are kept. Cancelling, the
 * backdrop and the back button leave the exercise as it was (FR-2). Used by
 * the active workout and the routine editor (FR-13).
 */
export function ApproachSetsPreviewSheet({
  preview,
  onConfirm,
  onCancel,
}: ApproachSetsPreviewSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={preview !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {preview ? (
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.grabber} />
            <View style={styles.titleRow}>
              <Ionicons name="flame-outline" size={18} color={colors.accent} />
              <Text style={styles.title}>
                {t('workouts.approachPreviewTitle', { exercise: preview.exerciseName })}
              </Text>
            </View>
            <Text style={styles.message}>
              {t('workouts.approachPreviewFrom', {
                weight: preview.workingWeight,
                unit: preview.unit,
              })}
            </Text>
            <View style={styles.list}>
              {preview.sets.map((set, index) => (
                <View key={`${set.weight}-${index}`} style={styles.setRow}>
                  <Text style={styles.setMarker}>{t('workouts.setType.warmup').charAt(0)}</Text>
                  <Text style={styles.setText}>
                    {t('workouts.approachPreviewSet', {
                      weight: set.weight,
                      unit: preview.unit,
                      reps: set.reps,
                    })}
                  </Text>
                </View>
              ))}
            </View>
            {preview.keptWarmUps > 0 ? (
              <Text style={styles.message}>
                {t('workouts.approachPreviewKept', { count: preview.keptWarmUps })}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={onCancel}
                style={styles.action}
              />
              <Button
                label={t('workouts.approachPreviewConfirm')}
                icon="add"
                onPress={onConfirm}
                style={styles.action}
              />
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radii.lg + 8,
    borderTopRightRadius: radii.lg + 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 17,
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
  },
  list: {
    gap: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setMarker: {
    width: 24,
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    textAlign: 'center',
  },
  setText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
