import { requireOptionalNativeModule } from 'expo';

type HomeWidgetNative = {
  /** False when the build has no App Group to share with the widget. */
  setSnapshot(json: string): Promise<boolean>;
};

/** Null on platforms without the native module (Android, web, older builds). */
export const HomeWidget = requireOptionalNativeModule<HomeWidgetNative>('HomeWidget');
