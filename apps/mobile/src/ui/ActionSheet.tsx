import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii, spacing } from '@/ui/theme';

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  /** Explanatory line under the title, e.g. why an action is withheld. */
  message?: string;
  actions: SheetAction[];
  onClose: () => void;
}

/** Bottom action sheet built from a plain Modal (no native dependency). */
export function ActionSheet({
  visible,
  title,
  message,
  actions,
  onClose,
}: ActionSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.grabber} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                onClose();
                action.onPress();
              }}
              style={({ pressed }) => [
                styles.action,
                pressed ? styles.actionPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  action.destructive ? styles.destructive : null,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancel,
              pressed ? styles.actionPressed : null,
            ]}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
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
    gap: spacing.xs,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 17,
    paddingVertical: spacing.sm,
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    paddingBottom: spacing.sm,
  },
  action: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  actionPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  actionText: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 17,
  },
  destructive: {
    color: colors.danger,
  },
  cancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelText: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
});
