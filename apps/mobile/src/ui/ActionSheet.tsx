import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';

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
  useTheme();
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

const styles = createStyles(() => ({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  title: {
    ...typeScale.body,
    color: colors.text,
    fontFamily: fonts.displayBold,
    paddingVertical: spacing.sm,
  },
  message: {
    ...typeScale.caption,
    color: colors.textMuted,
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
    ...typeScale.body,
    color: colors.text,
    fontFamily: fonts.display,
  },
  destructive: {
    color: colors.dangerInk,
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
    ...typeScale.body,
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
  },
}));
