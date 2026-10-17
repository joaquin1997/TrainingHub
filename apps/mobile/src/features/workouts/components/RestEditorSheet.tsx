import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WheelPicker } from '@/features/workouts/components/WheelPicker';
import { Button } from '@/ui/Button';
import { colors, fonts, radii, spacing } from '@/ui/theme';

const REST_MINUTES = Array.from({ length: 11 }, (_, i) => i); // 0–10 min
const REST_SECONDS = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,…,55
const MAX_REST_SECONDS = 10 * 60 + 55;
const pad2 = (value: number) => String(value).padStart(2, '0');

/** The wheels' nearest value: a multiple of 5 seconds, at most 10:55. */
const toWheelSeconds = (seconds: number) =>
  Math.min(MAX_REST_SECONDS, Math.max(0, Math.round(seconds / 5) * 5));

interface RestEditorSheetProps {
  visible: boolean;
  exerciseName: string;
  /** The exercise's current rest, in seconds. */
  seconds: number;
  onSave: (seconds: number) => void;
  onClose: () => void;
}

/**
 * Changes one exercise's rest for the rest of the workout (spec 0018 FR-2).
 * The routine is not changed.
 */
export function RestEditorSheet({
  visible,
  exerciseName,
  seconds,
  onSave,
  onClose,
}: RestEditorSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(() => toWheelSeconds(seconds));

  // Each opening starts from the exercise's current rest.
  useEffect(() => {
    if (visible) {
      setValue(toWheelSeconds(seconds));
    }
  }, [visible, seconds]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.grabber} />
          <Text style={styles.title}>{t('workouts.restEditTitle', { exercise: exerciseName })}</Text>
          <Text style={styles.message}>{t('workouts.restEditHint')}</Text>
          <View style={styles.wheelRow}>
            <View style={styles.wheelGroup}>
              <WheelPicker
                values={REST_MINUTES}
                value={Math.floor(value / 60)}
                onChange={(minutes) => setValue(minutes * 60 + (value % 60))}
                formatItem={pad2}
              />
              <Text style={styles.wheelUnit}>{t('workouts.min')}</Text>
            </View>
            <Text style={styles.wheelColon}>:</Text>
            <View style={styles.wheelGroup}>
              <WheelPicker
                values={REST_SECONDS}
                value={value % 60}
                onChange={(secs) => setValue(Math.floor(value / 60) * 60 + secs)}
                formatItem={pad2}
              />
              <Text style={styles.wheelUnit}>{t('workouts.sec')}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button label={t('common.cancel')} variant="secondary" onPress={onClose} style={styles.action} />
            <Button
              label={t('common.save')}
              onPress={() => {
                onSave(value);
                onClose();
              }}
              style={styles.action}
            />
          </View>
        </Pressable>
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
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 17,
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
  },
  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  wheelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wheelUnit: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  wheelColon: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
