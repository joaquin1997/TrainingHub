import { Alert, Platform } from 'react-native';

import { haptics } from '@/ui/haptics';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

/**
 * Asks the person to confirm an action; resolves `true` when they do. A
 * confirmed destructive action gives the warning haptic (spec 0034 FR-4).
 */
export async function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const confirmed = await ask(options);
  if (confirmed && options.destructive) {
    haptics.destructiveConfirm();
  }
  return confirmed;
}

/** `Alert.alert` does nothing on web, so web uses the browser's confirm. */
function ask({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
