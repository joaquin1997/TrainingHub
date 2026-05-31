import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/ui/Button';
import { colors, commonStyles, spacing } from '@/ui/theme';

export function AuthLandingScreen() {
  const { t } = useTranslation();
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const submit = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register(email.trim(), password, displayName.trim() || undefined);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>TrainingHub</Text>
        <Text style={styles.subtitle}>
          {isRegister
            ? t('auth.subtitleRegister')
            : t('auth.subtitleLogin')}
        </Text>

        {isRegister ? (
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('auth.namePlaceholder')}
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            autoCapitalize="words"
          />
        ) : null}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          inputMode="email"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.passwordPlaceholder')}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={
            isSubmitting
              ? t('common.pleaseWait')
              : isRegister
                ? t('auth.createAccount')
                : t('auth.signIn')
          }
          onPress={() => void submit()}
          disabled={isSubmitting}
          fullWidth
        />
        <Button
          label={
            isRegister ? t('auth.haveAccount') : t('auth.noAccount')
          }
          variant="secondary"
          onPress={() => {
            setError(undefined);
            setMode(isRegister ? 'login' : 'register');
          }}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...commonStyles.screen,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  brand: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  input: {
    ...commonStyles.input,
  },
  error: {
    ...commonStyles.error,
  },
});
