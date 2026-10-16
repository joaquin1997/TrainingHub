import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { colors, fonts, spacing } from '@/ui/theme';

interface StateViewProps {
  kind: 'loading' | 'empty' | 'error';
  title?: string;
  message?: string;
  /** Empty states: the icon above the title. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** The single action the screen already offers here (retry, create). */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * One look for loading, empty and error states on every screen (spec 0017
 * EF-1): an icon or spinner, a title, a sentence and at most one action.
 */
export function StateView({ kind, title, message, icon, actionLabel, onAction }: StateViewProps) {
  return (
    <View style={styles.container}>
      {kind === 'loading' ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Ionicons
          name={kind === 'error' ? 'alert-circle-outline' : (icon ?? 'file-tray-outline')}
          size={40}
          color={kind === 'error' ? colors.danger : colors.textSubtle}
        />
      )}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? (
        <Text style={[styles.message, kind === 'error' ? styles.errorMessage : null]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant={kind === 'empty' ? 'primary' : 'secondary'}
          style={styles.action}
        />
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
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorMessage: {
    color: colors.danger,
  },
  action: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
});
