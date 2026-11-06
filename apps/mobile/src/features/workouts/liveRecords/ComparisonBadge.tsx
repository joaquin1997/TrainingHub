import type { RecordComparisonHit, WeightUnit } from '@workout/domain';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/ui/Button';
import { colors, createStyles, radii, spacing, typeScale, useTheme } from '@/ui/theme';
import { comparisonDetail, comparisonSummary } from './comparisonLabel';

/** Separate from Done: opening the evidence never changes a performed set. */
export function ComparisonBadge({ hits, unit }: { hits?: RecordComparisonHit[]; unit: WeightUnit }) {
  useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  if (!hits?.length) return null;
  const detail = (hit: RecordComparisonHit) => comparisonDetail(hit, unit, t) +
    (hit.referenceDate ? ` · ${t('workouts.recordComparison.sessionDate', { date: new Date(hit.referenceDate).toLocaleDateString(i18n.language) })}` : '');
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={hits.map(detail).join('; ')}
      accessibilityHint={t('workouts.recordComparison.details')} onPress={() => setOpen(true)} style={styles.badge}>
      <Text style={hits[0]!.baselineScope === 'historical' ? styles.record : styles.text}>{comparisonSummary(hits, unit, t)}</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]} onStartShouldSetResponder={() => true}>
          <ScrollView>
            <Text accessibilityRole="header" style={styles.title}>{t('workouts.recordComparison.details')}</Text>
            {hits.map((hit) => <Text key={`${hit.baselineScope}-${hit.type}`} style={styles.detail}>{detail(hit)}</Text>)}
          </ScrollView>
          <Button label={t('common.close')} variant="secondary" onPress={() => setOpen(false)} fullWidth />
        </View>
      </Pressable>
    </Modal>
  </>;
}
const styles = createStyles(() => ({
  badge: { minHeight: 44, justifyContent: 'center', paddingVertical: spacing.xs },
  text: { ...typeScale.caption, color: colors.successInk },
  record: { ...typeScale.caption, color: colors.accentInk },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, maxHeight: '85%' },
  title: { ...typeScale.heading, color: colors.text, marginBottom: spacing.md },
  detail: { ...typeScale.body, color: colors.text, marginBottom: spacing.md },
}));
