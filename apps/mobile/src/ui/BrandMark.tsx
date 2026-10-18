import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { colors, createStyles, radii, useTheme } from '@/ui/theme';

interface BrandMarkProps {
  /** Side of the tile; the pulse takes about two thirds of it. */
  size?: number;
}

/**
 * The brand mark (spec 0035 FR-13): the lime pulse of the app icon on a soft
 * lime tile. Decorative everywhere: not a control, and hidden from screen
 * readers.
 */
export function BrandMark({ size = 24 }: BrandMarkProps) {
  useTheme();
  return (
    <View
      accessible={false}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, size >= 48 ? styles.tileLarge : null, { width: size, height: size }]}
    >
      <Ionicons name="pulse" size={Math.round(size * 0.66)} color={colors.primaryInk} />
    </View>
  );
}

const styles = createStyles(() => ({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
  },
  tileLarge: {
    borderRadius: radii.lg,
  },
}));
