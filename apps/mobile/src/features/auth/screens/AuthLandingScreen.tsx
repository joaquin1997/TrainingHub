import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { findAuthProvider } from '@/features/auth/providers';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';

export function AuthLandingScreen() {
  const appleProvider = findAuthProvider('apple');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleAppleSignIn = async () => {
    if (!appleProvider) {
      setStatusMessage('Apple provider stub is not configured.');
      return;
    }

    const credential = await appleProvider.createCredential();

    setStatusMessage(
      `Mock Apple sign-in complete. Credential created with provider ${credential.providerId}.`,
    );

    // TODO: Send the Apple credential to the backend auth route when the client API layer is introduced.
    // TODO: Replace placeholder success state with real session bootstrap and token refresh handling.
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>TrainingHub</Text>
        <Text style={styles.title}>Track every lift with less friction.</Text>
        <Text style={styles.body}>
          Build routines, start a workout from your plan and keep your progress
          visible while the auth layer stays isolated.
        </Text>
      </View>
      {appleProvider ? (
        <View style={styles.providerList}>
          <View style={styles.providerCard}>
            <Text style={styles.providerLabel}>{appleProvider.label}</Text>
            <Text style={styles.providerMeta}>
              iOS-first sign-in path prepared behind the provider abstraction.
            </Text>
            <Pressable
              onPress={handleAppleSignIn}
              style={({ pressed }) => [
                styles.button,
                pressed ? commonStyles.pressed : null,
              ]}
            >
              <Text style={styles.buttonText}>Sign in with Apple</Text>
            </Pressable>
            <Text style={styles.providerMeta}>
              This currently creates a mock credential only.
            </Text>
          </View>
        </View>
      ) : null}
      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
      <RouteLinks currentRoute="auth" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.fixedContent,
    justifyContent: 'center',
  },
  hero: {
    gap: spacing.md,
  },
  kicker: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  title: {
    ...commonStyles.title,
  },
  body: {
    ...commonStyles.body,
  },
  providerList: {
    gap: spacing.md,
  },
  providerCard: {
    ...commonStyles.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  providerLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  providerMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  button: {
    ...commonStyles.primaryButton,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  buttonText: {
    ...commonStyles.primaryButtonText,
  },
  status: {
    color: colors.primary,
    fontSize: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
  },
});
