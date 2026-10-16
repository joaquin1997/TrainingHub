import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View } from 'react-native';

import { colors, radii } from '@/ui/theme';

/** The exercise's catalog image, or a neutral tile when it has none (spec 0017 FR-23). */
export function ExerciseThumb({ imageUrl, size = 48 }: { imageUrl?: string; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <Ionicons name="barbell-outline" size={size * 0.45} color={colors.textSubtle} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
