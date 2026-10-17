import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';

import type { ShareImageResult } from './shareImage';

/**
 * Web build of `shareImage.ts` (spec 0034 FR-25): the image share is not
 * offered on web — `react-native-view-shot` needs an extra web-only library
 * there — so only the text share shows (plan-b, *Risks*). Keeping this file
 * separate also keeps both native modules out of the web bundle.
 */
export function shareImageAvailable(): boolean {
  return false;
}

export async function captureAndShare(
  _ref: RefObject<ComponentRef<typeof View> | null>,
  _options: { dialogTitle?: string } = {},
): Promise<ShareImageResult> {
  return 'failed';
}
