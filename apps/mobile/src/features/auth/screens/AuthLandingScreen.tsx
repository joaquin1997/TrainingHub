import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import { findAuthProvider } from '@/features/auth/providers';

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
      <Text style={styles.title}>Auth Landing</Text>
      <Text style={styles.body}>
        Placeholder screen for the initial authentication flow.
      </Text>
      <Text style={styles.todo}>
        TODO: Add Apple sign-in provider wiring behind an auth abstraction.
      </Text>
      {appleProvider ? (
        <View style={styles.providerList}>
          <View style={styles.providerCard}>
            <Text style={styles.providerLabel}>{appleProvider.label}</Text>
            <Text style={styles.providerMeta}>
              Provider ID: {appleProvider.id}
            </Text>
            <Pressable onPress={handleAppleSignIn} style={styles.button}>
              <Text style={styles.buttonText}>Sign in with Apple</Text>
            </Pressable>
            <Text style={styles.providerMeta}>
              Placeholder only. No real provider integration yet.
            </Text>
          </View>
        </View>
      ) : null}
      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
      <Text style={styles.todo}>
        TODO: Add server-issued session handling and token refresh after provider sign-in is connected.
      </Text>
      <RouteLinks currentRoute="auth" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  todo: {
    fontSize: 14,
    color: '#4b5563',
  },
  providerList: {
    gap: 10,
  },
  providerCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  providerLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  providerMeta: {
    fontSize: 13,
    color: '#4b5563',
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    color: '#4b5563',
  },
});
