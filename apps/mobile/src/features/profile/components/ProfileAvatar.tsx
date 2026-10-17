import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, typeScale } from '@/ui/theme';

interface ProfileAvatarProps {
  photoDataUrl: string | null | undefined;
  name: string | null | undefined;
  size?: number;
}

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase())
    .join('');
}

/**
 * The profile photo, or the name's initials on a neutral circle; a neutral
 * person mark when there are no initials either (spec 0035 EF-2).
 */
export function ProfileAvatar({ photoDataUrl, name, size = 56 }: ProfileAvatarProps) {
  const shape = { width: size, height: size, borderRadius: radii.round };

  if (photoDataUrl) {
    return <Image source={{ uri: photoDataUrl }} style={[styles.base, shape]} accessibilityIgnoresInvertColors />;
  }

  const initials = initialsOf(name);
  return (
    <View style={[styles.base, styles.placeholder, shape]}>
      {initials ? (
        <Text style={[styles.initials, size >= 80 ? typeScale.title : typeScale.heading]}>{initials}</Text>
      ) : (
        <Ionicons name="person" size={Math.round(size * 0.5)} color={colors.textMuted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  initials: {
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
  },
});
