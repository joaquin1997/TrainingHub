import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import {
  isGoogleSignInAvailable,
  signInWithGoogleSheet,
} from '@/features/auth/providers/googleSignIn';
import { ApiError } from '@/lib/http';
import { Button } from '@/ui/Button';
import { colors, commonStyles, createStyles, fonts, keyboardAppearance, radii, spacing, typeScale, useTheme } from '@/ui/theme';

export function AuthLandingScreen() {
  useTheme();
  const { t } = useTranslation();
  const { signIn, register, signInWithGoogle } = useAuth();
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

  // Spec 0039: only on a build with the Google client id (FR-1, AC-1).
  const offersGoogle = isGoogleSignInAvailable();

  const continueWithGoogle = async () => {
    setError(undefined);
    setIsSubmitting(true);
    try {
      const idToken = await signInWithGoogleSheet();
      // Closed the sheet: back here, no message (EF-1).
      if (idToken) {
        await signInWithGoogle(idToken);
      }
    } catch (e) {
      // Not configured on the server (EF-5), an unverified email that has an
      // account (EF-4), or anything else: rejected or unreachable (EF-2, EF-3).
      setError(
        e instanceof ApiError && e.status === 503
          ? t('auth.googleUnavailable')
          : e instanceof ApiError && e.status === 409
            ? t('auth.googleEmailTaken')
            : t('auth.googleFailed'),
      );
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
            <Ionicons name="pulse" size={30} color={colors.primaryInk} />
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
                keyboardAppearance={keyboardAppearance()}
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
              keyboardAppearance={keyboardAppearance()}
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
              keyboardAppearance={keyboardAppearance()}
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
        {offersGoogle ? (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.or')}</Text>
              <View style={styles.dividerLine} />
            </View>
            <Button
              label={t('auth.continueWithGoogle')}
              icon="logo-google"
              variant="secondary"
              onPress={() => void continueWithGoogle()}
              disabled={isSubmitting}
              fullWidth
            />
          </>
        ) : null}
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
  useTheme();
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      {children}
    </View>
  );
}

const styles = createStyles(() => ({
  screen: {
    ...commonStyles.screen,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typeScale.caption,
    color: colors.textMuted,
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
}));
