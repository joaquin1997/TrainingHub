/** The part of React Native's `UIManager` the guard reads. */
export interface ViewManagerRegistry {
  hasViewManagerConfig?: (name: string) => boolean;
}

/** The native view `react-native-svg` draws a path with. */
export const SVG_PATH_VIEW = 'RNSVGPath';

/**
 * Whether the line chart can be drawn (spec 0034, plan-b B2 "old binary
 * guard"). `react-native-svg` is a native module: a JS update can reach a phone
 * whose binary was built before it was added, and rendering its views there
 * would fail. Web always has SVG. On native the view must be registered; on
 * the New Architecture (bridgeless) `hasViewManagerConfig` asks the native
 * component registry, which answers false for an unknown name. Any error is
 * read as "not available", so the chart falls back to bars.
 */
export function canDrawSvg(platform: string, registry: ViewManagerRegistry | undefined): boolean {
  if (platform === 'web') {
    return true;
  }

  try {
    return registry?.hasViewManagerConfig?.(SVG_PATH_VIEW) === true;
  } catch {
    return false;
  }
}
