import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/ui/BrandMark';
import { colors, commonStyles, fonts, radii, spacing, typeScale } from '@/ui/theme';

interface ScreenTitleProps {
  title: string;
  /** A screen-level action the screen already has, e.g. "create" (FR-11). */
  action?: {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
}

/**
 * Large title at the top of a tab's root screen, which hides the native header
 * (spec 0017 FR-11), led by the small brand mark at the same place on every
 * tab (spec 0035 FR-13). Rendered as the first child of the screen's scroll view.
 */
export function ScreenTitle({ title, action }: ScreenTitleProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.titleGroup}>
        <BrandMark size={28} />
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed ? commonStyles.pressed : null]}
        >
          {action.icon ? (
            <Ionicons name={action.icon} size={18} color={colors.primary} />
          ) : null}
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  title: {
    ...commonStyles.title,
    flexShrink: 1,
  },
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
  },
  actionLabel: {
    ...typeScale.body,
    color: colors.primary,
    fontFamily: fonts.displayBold,
  },
});
