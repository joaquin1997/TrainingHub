import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { greetingKey } from '@/features/routines/utils/greeting';
import { getRoutineExerciseNames } from '@/features/routines/utils/routineSummary';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { colors, commonStyles, createStyles, spacing, useTheme } from '@/ui/theme';
import type { Routine, UserProfile } from '@workout/domain';

interface HomeHeaderProps {
  /** Null while unknown (not loaded, or failed): no name, no photo (EF-1, EF-3). */
  profile: UserProfile | null;
  /** Null when the history could not be loaded: the chips are hidden (EF-3). */
  week: { streak: number; thisWeek: number } | null;
  /** Null hides the card: no routines, a workout in progress, or no history (FR-7, EF-3). */
  today: Routine | null;
  /** One line under the card, e.g. the suggested routine no longer exists (EF-5). */
  notice?: string;
  onOpenProfile: () => void;
  onOpenRoutine: (routine: Routine) => void;
  onStart: (routine: Routine) => void;
}

/**
 * The top of the Routines tab (spec 0035 FR-1 – FR-7): greeting with the
 * person's photo (tap → profile), the week-streak and this-week chips, and
 * the Today's routine card with its start action.
 */
export function HomeHeader({
  profile,
  week,
  today,
  notice,
  onOpenProfile,
  onOpenRoutine,
  onStart,
}: HomeHeaderProps) {
  useTheme();
  const { t } = useTranslation();
  const name = profile?.displayName?.trim() || null;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.openProfile')}
        onPress={onOpenProfile}
        style={({ pressed }) => [styles.greetingRow, pressed ? commonStyles.pressed : null]}
      >
        <ProfileAvatar photoDataUrl={profile?.photoDataUrl} name={name} size={44} />
        <Text style={styles.greeting}>{t(greetingKey(new Date(), name), { name })}</Text>
      </Pressable>

      {week ? (
        <View style={styles.chips}>
          {week.streak > 0 ? (
            <Chip icon="flame" tone="primary" label={t('home.streak', { count: week.streak })} />
          ) : null}
          <Chip icon="calendar-outline" label={t('home.thisWeek', { count: week.thisWeek })} />
        </View>
      ) : null}

      {today ? (
        <Pressable
          onPress={() => onOpenRoutine(today)}
          style={({ pressed }) => [styles.card, pressed ? commonStyles.pressed : null]}
        >
          <View style={styles.cardText}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {t('home.todayTitle', { name: today.name })}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="barbell-outline" size={14} color={colors.textMuted} />
              <Text style={styles.meta}>
                {t('routines.exerciseCount', { count: getRoutineExerciseNames(today).length })}
              </Text>
            </View>
          </View>
          <Button label={t('home.todayStart')} icon="play" onPress={() => onStart(today)} />
        </Pressable>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

const styles = createStyles(() => ({
  container: {
    gap: spacing.md,
  },
  greetingRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'flex-start',
  },
  greeting: {
    ...commonStyles.heading,
    flexShrink: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    ...commonStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderColor: colors.primary,
  },
  cardText: {
    flex: 1,
    gap: spacing.xxs,
  },
  cardTitle: {
    ...commonStyles.cardTitle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meta: {
    ...commonStyles.meta,
  },
  notice: {
    ...commonStyles.meta,
    color: colors.danger,
  },
}));
