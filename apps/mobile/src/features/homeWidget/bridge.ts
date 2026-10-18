import { Platform } from 'react-native';

import { HomeWidget } from '../../../modules/home-widget';

import type { HomeWidgetSnapshot } from './snapshot';

/**
 * Where the home-screen widget gets its figures (spec 0036; constitution
 * Art. 6). iOS with the native module only; elsewhere nothing happens.
 */
export const homeWidgetBridge = {
  async push(snapshot: HomeWidgetSnapshot): Promise<void> {
    if (Platform.OS !== 'ios' || !HomeWidget) {
      return;
    }
    await HomeWidget.setSnapshot(JSON.stringify(snapshot)).catch(() => false);
  },
};
