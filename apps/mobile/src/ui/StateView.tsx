import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { colors, fonts, spacing, typeScale } from '@/ui/theme';

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
 * EF-1): an icon or spinner, a title, a sentence and at most one action. The
 * empty case is the shared `EmptyState` block (spec 0034 FR-13); list screens
 * show a skeleton instead of the spinner while they first load (FR-15).
 */
export function StateView({ kind, title, message, icon, actionLabel, onAction }: StateViewProps) {
  if (kind === 'empty') {
    return (
      <EmptyState
        icon={icon}
        title={title}
        message={message}
        action={actionLabel && onAction ? { label: actionLabel, onPress: onAction } : undefined}
      />
    );
  }

  return (
    <View style={styles.container}>
      {kind === 'loading' ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
      )}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? (
        <Text style={[styles.message, kind === 'error' ? styles.errorMessage : null]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
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
    ...typeScale.heading,
    color: colors.text,
    fontFamily: fonts.displayBold,
    textAlign: 'center',
  },
  message: {
    ...typeScale.caption,
    color: colors.textMuted,
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
