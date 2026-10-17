import type { ComponentRef, RefObject } from 'react';
import { NativeModules, TurboModuleRegistry, type View } from 'react-native';

/**
 * Sharing a workout as an image (spec 0034 FR-25), behind one interface
 * (constitution Article 6): screens never import `react-native-view-shot` or
 * `expo-sharing`. The web build uses `shareImage.web.ts` instead, which offers
 * nothing (plan-b: the image action is not offered on web).
 *
 * Both modules are native. A binary built before they were added has neither,
 * so they are looked up lazily, inside `try`: the app keeps working and the
 * image action is simply hidden until the rebuild.
 */
type ViewShot = typeof import('react-native-view-shot');
type Sharing = typeof import('expo-sharing');

let modules: { viewShot: ViewShot; sharing: Sharing } | null | undefined;

function loadModules() {
  if (modules !== undefined) {
    return modules;
  }

  modules = null;
  try {
    // view-shot's JS loads without its native side and only fails on capture,
    // so its native module is checked first.
    const hasViewShot = Boolean(
      TurboModuleRegistry.get('RNViewShot') ?? NativeModules.RNViewShot,
    );
    if (hasViewShot) {
      // `expo-sharing` throws at import when its native module is missing.
      const sharing = require('expo-sharing') as Sharing;
      const viewShot = require('react-native-view-shot') as ViewShot;
      modules = { viewShot, sharing };
    }
  } catch {
    modules = null;
  }
  return modules;
}

/** Whether the image can be captured and shared on this device and build. */
export function shareImageAvailable(): boolean {
  return loadModules() !== null;
}

/** `shared` also covers a share sheet the person closed without choosing an app. */
export type ShareImageResult = 'shared' | 'failed';

/** The share image's size in pixels (4:5). */
const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = 1350;

/**
 * Captures the card view as a PNG and opens the system share sheet with it.
 * Never throws: any failure resolves `failed` so the caller can say so in one
 * line and keep the text share (EF-6).
 */
export async function captureAndShare(
  ref: RefObject<ComponentRef<typeof View> | null>,
  { dialogTitle }: { dialogTitle?: string } = {},
): Promise<ShareImageResult> {
  const loaded = loadModules();
  if (!loaded || !ref.current) {
    return 'failed';
  }

  try {
    const uri = await loaded.viewShot.captureRef(ref, {
      format: 'png',
      quality: 1,
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      result: 'tmpfile',
    });
    await loaded.sharing.shareAsync(uri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle,
    });
    return 'shared';
  } catch {
    return 'failed';
  }
}
