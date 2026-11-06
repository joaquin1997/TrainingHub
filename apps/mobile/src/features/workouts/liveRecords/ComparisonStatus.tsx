import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { colors, createStyles, spacing, typeScale, useTheme } from '@/ui/theme';
import type { WorkoutSessionDraft } from '../state/workoutDraftStore';
import { startingRecordsFor } from './startingRecordsDraft';
import { lastSessionFor, type ComparisonLoadStates } from './comparisonResource';
export function ComparisonStatus({ draft, exerciseId, states, retry }: {
  draft: WorkoutSessionDraft; exerciseId: string; states: ComparisonLoadStates; retry: () => void;
}) {
  useTheme();
  const { t } = useTranslation();
  const absent = { historical: !startingRecordsFor(draft, exerciseId), lastSession: lastSessionFor(draft, exerciseId) === undefined };
  const missing = (['historical', 'lastSession'] as const).filter((source) => absent[source]);
  if (!missing.length) return null;
  const pending = missing.some((source) => (states[exerciseId]?.[source] ?? 'loading') === 'loading');
  return <View style={styles.container}>
    {missing.map((source) => <Text key={source} style={styles.text} accessibilityLiveRegion="polite">
      {t(`workouts.recordComparison.${source}Source`)}: {t(`workouts.recordComparison.${states[exerciseId]?.[source] ?? 'loading'}`)}
    </Text>)}
    {!pending ? <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
      <Text style={styles.text}>{t('common.retry')}</Text>
    </Pressable> : null}
  </View>;
}
const styles = createStyles(() => ({
  container: { gap: spacing.xxs, marginTop: spacing.xs },
  text: { ...typeScale.caption, color: colors.textMuted },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
}));
