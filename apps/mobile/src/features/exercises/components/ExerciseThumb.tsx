import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { ExerciseImage } from '@/features/exercises/components/ExerciseImage';
import { colors, createStyles, radii, useTheme } from '@/ui/theme';

/** The exercise's image, or a neutral tile when it has none or it fails to load (specs 0017, 0026). */
export function ExerciseThumb({ imageUrl, size = 48 }: { imageUrl?: string; size?: number }) {
  useTheme();
  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      <ExerciseImage
        imageUrl={imageUrl}
        style={styles.image}
        fallback={<Ionicons name="barbell-outline" size={size * 0.45} color={colors.textSubtle} />}
      />
    </View>
  );
}

const styles = createStyles(() => ({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.imageBackdrop,
  },
}));
