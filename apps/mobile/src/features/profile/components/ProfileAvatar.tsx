import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/ui/theme';

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

/** The profile photo, or the name's initials on a neutral circle. */
export function ProfileAvatar({ photoDataUrl, name, size = 56 }: ProfileAvatarProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (photoDataUrl) {
    return <Image source={{ uri: photoDataUrl }} style={[styles.base, shape]} accessibilityIgnoresInvertColors />;
  }

  return (
    <View style={[styles.base, styles.placeholder, shape]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initialsOf(name) || '?'}</Text>
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
