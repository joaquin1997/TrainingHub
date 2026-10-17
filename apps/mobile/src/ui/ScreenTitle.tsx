import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
 * (spec 0017 FR-11). Rendered as the first child of the screen's scroll view.
 */
export function ScreenTitle({ title, action }: ScreenTitleProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.sm }]}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
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
