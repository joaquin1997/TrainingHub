import { Modal, StyleSheet, View } from 'react-native';

import type { Exercise } from '@workout/domain';

import { CustomExerciseForm } from '@/features/exercises/components/CustomExerciseForm';
import { colors, radii, spacing } from '@/ui/theme';

type CustomExerciseModalProps = {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onCreated: (exercise: Exercise) => void;
};

/** {@link CustomExerciseForm} in a centred modal; closes once created. */
export function CustomExerciseModal({
  visible,
  initialName,
  onClose,
  onCreated,
}: CustomExerciseModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {visible ? (
            <CustomExerciseForm
              initialName={initialName}
              onCancel={onClose}
              onCreated={(exercise) => {
                onCreated(exercise);
                onClose();
              }}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    maxHeight: '85%',
    borderRadius: radii.lg + 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
