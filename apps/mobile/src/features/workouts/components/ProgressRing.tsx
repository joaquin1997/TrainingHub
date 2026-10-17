import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/ui/theme';

interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  /** Fraction of the ring that is filled, 0..1. */
  progress: number;
  color?: string;
  trackColor?: string;
  holeColor?: string;
  children?: ReactNode;
}

/**
 * Circular progress ring built from plain views (no native dependency), so it
 * works the same on iOS/Android/web. Implemented as two rotating half-disks
 * over a track disk, with a center hole punched out to leave a ring. Fills
 * clockwise starting at 12 o'clock.
 */
export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color = colors.primary,
  trackColor = colors.borderStrong,
  holeColor = colors.surfaceRaised,
  children,
}: ProgressRingProps) {
  const p = Math.max(0, Math.min(1, progress));
  const half = size / 2;
  const hole = size - strokeWidth * 2;
  const firstRotate = `${p <= 0.5 ? p * 360 : 180}deg`;
  const secondRotate = `${p <= 0.5 ? 0 : (p - 0.5) * 360}deg`;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: trackColor,
        }}
      />

      {/* Right half: reveals the first 0–180° of fill. */}
      <View style={[styles.clip, { width: half, height: size, left: half }]}>
        <View
          style={{
            position: 'absolute',
            left: -half,
            width: half,
            height: size,
            borderTopLeftRadius: half,
            borderBottomLeftRadius: half,
            backgroundColor: color,
            transformOrigin: 'right center',
            transform: [{ rotate: firstRotate }],
          }}
        />
      </View>

      {/* Left half: reveals 180–360° of fill once past the halfway point. */}
      <View style={[styles.clip, { width: half, height: size, left: 0 }]}>
        <View
          style={{
            position: 'absolute',
            left: half,
            width: half,
            height: size,
            borderTopRightRadius: half,
            borderBottomRightRadius: half,
            backgroundColor: p > 0.5 ? color : trackColor,
            transformOrigin: 'left center',
            transform: [{ rotate: secondRotate }],
          }}
        />
      </View>

      {/* Center hole turns the disk into a ring. */}
      <View
        style={{
          position: 'absolute',
          width: hole,
          height: hole,
          borderRadius: radii.round,
          backgroundColor: holeColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
});
