import { Alert, Platform } from 'react-native';

/** A one-line notice the person dismisses; `Alert.alert` does nothing on web. */
export function notify(message: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(message);
    return;
  }
  Alert.alert(message);
}
