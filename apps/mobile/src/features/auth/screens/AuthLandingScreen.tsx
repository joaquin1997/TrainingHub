import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/ui/Button';
import { colors, commonStyles, fonts, radii, spacing, typeScale } from '@/ui/theme';

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

  const switchMode = (next: 'login' | 'register') => {
    if (next !== mode) {
      setError(undefined);
      setMode(next);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <View style={styles.mark}>
            <Ionicons name="pulse" size={30} color={colors.primary} />
          </View>
          <Text style={styles.brand}>TrainingHub</Text>
          <Text style={styles.subtitle}>
            {isRegister ? t('auth.subtitleRegister') : t('auth.subtitleLogin')}
          </Text>
        </View>

        <View style={styles.switcher}>
          {(['login', 'register'] as const).map((option) => {
            const selected = mode === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => switchMode(option)}
                style={[styles.switchItem, selected ? styles.switchItemActive : null]}
              >
                <Text style={[styles.switchText, selected ? styles.switchTextActive : null]}>
                  {option === 'login' ? t('auth.signIn') : t('auth.createAccount')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.fields}>
          {isRegister ? (
            <Field icon="person-outline">
              <TextInput
                keyboardAppearance="dark"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('auth.namePlaceholder')}
                placeholderTextColor={colors.textSubtle}
                style={styles.fieldInput}
                autoCapitalize="words"
              />
            </Field>
          ) : null}
          <Field icon="mail-outline">
            <TextInput
              keyboardAppearance="dark"
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={styles.fieldInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
            />
          </Field>
          <Field icon="lock-closed-outline">
            <TextInput
              keyboardAppearance="dark"
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={styles.fieldInput}
              secureTextEntry
            />
          </Field>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={
            isSubmitting
              ? t('common.pleaseWait')
              : isRegister
                ? t('auth.createAccount')
                : t('auth.signIn')
          }
          icon={isSubmitting ? undefined : 'arrow-forward'}
          onPress={() => void submit()}
          disabled={isSubmitting}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  icon,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      {children}
    </View>
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
    gap: spacing.lg,
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  mark: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  brand: {
    ...commonStyles.title,
  },
  subtitle: {
    ...commonStyles.body,
    textAlign: 'center',
  },
  switcher: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.xs,
  },
  switchItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
  },
  switchItemActive: {
    backgroundColor: colors.surfaceRaised,
  },
  switchText: {
    ...typeScale.body,
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
  },
  switchTextActive: {
    color: colors.text,
  },
  fields: {
    gap: spacing.sm,
  },
  field: {
    ...commonStyles.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 0,
  },
  fieldInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    color: colors.text,
    fontSize: typeScale.body.fontSize,
  },
  error: {
    ...commonStyles.error,
    textAlign: 'center',
  },
});
