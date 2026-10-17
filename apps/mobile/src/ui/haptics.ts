import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { createHapticLanguage } from './hapticLanguage';

/**
 * The app's haptic language (spec 0034 FR-4), on `expo-haptics`. Feature code
 * imports only this. Web has no haptics (EF-1); a binary built before the
 * module was added rejects each call, which the language swallows.
 */
export const haptics = createHapticLanguage(
  Platform.OS === 'web'
    ? null
    : {
        impact: (style) =>
          Haptics.impactAsync(
            style === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy,
          ),
        notification: (type) =>
          Haptics.notificationAsync(
            type === 'success'
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning,
          ),
      },
);
