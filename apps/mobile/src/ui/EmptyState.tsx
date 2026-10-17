import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/ui/BrandMark';
import { Button } from '@/ui/Button';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';

export interface EmptyStateProps {
  /**
   * An icon in the screen's own subject, or `brand` for the brand mark on the
   * first screens a new account sees (spec 0035 FR-13).
   */
  icon?: keyof typeof Ionicons.glyphMap | 'brand';
  title?: string;
  message?: string;
  /** At most one action, leading to an existing place (spec 0034 FR-14). */
  action?: { label: string; onPress: () => void };
}

/**
 * The one empty state (spec 0034 FR-13, FR-14): a lime icon on a round tile,
 * a title, one sentence and at most one action.
 */
export function EmptyState({ icon = 'file-tray-outline', title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon === 'brand' ? (
        <View style={styles.markSpacing}>
          <BrandMark size={64} />
        </View>
      ) : (
        <View style={styles.iconTile}>
          <Ionicons name={icon} size={32} color={colors.primary} />
        </View>
      )}
      {title ? (
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action ? (
        <Button label={action.label} onPress={action.onPress} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconTile: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.xs,
  },
  markSpacing: {
    marginBottom: spacing.xs,
  },
  title: {
    ...commonStyles.cardTitle,
    textAlign: 'center',
  },
  message: {
    ...commonStyles.body,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
});
