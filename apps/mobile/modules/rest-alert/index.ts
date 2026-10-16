import { requireOptionalNativeModule } from 'expo';

type RestAlertNative = {
  requestPermission(): Promise<boolean>;
  /** Replaces the single rest alert with one at `atMs` (epoch ms). */
  schedule(atMs: number, title: string, body: string): Promise<void>;
  /** Removes the pending and the delivered rest alert. */
  cancel(): Promise<void>;
};

/** Null on platforms without the native module (Android, web, Expo Go, older builds). */
export const RestAlert = requireOptionalNativeModule<RestAlertNative>('RestAlert');
