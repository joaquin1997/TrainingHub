import { Ionicons } from '@expo/vector-icons';
import type { WeightUnit } from '@workout/domain';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { colors, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';

import type { RecordNotice as Notice } from './liveRecordBadges';
import { recordBadgeLabel } from './recordBadgeLabel';

/**
 * The short notice when a set marked done earns a record badge (spec 0032
 * FR-20): over the top of the screen, never blocking a tap, gone on its own
 * (`useLiveRecords`). It touches nothing else in the workout (FR-21).
 */
export function RecordNotice({
  notice,
  unit,
  top,
}: {
  notice?: Notice;
  unit: WeightUnit;
  /** Distance from the top of the screen, e.g. below the sticky workout header (spec 0034). */
  top?: number;
}) {
  useTheme();
  const { t } = useTranslation();

  if (!notice) {
    return null;
  }

  const title = recordBadgeLabel(notice.hits, unit, t);

  return (
    <View pointerEvents="none" style={[styles.overlay, top !== undefined ? { top } : null]}>
      <View
        style={styles.notice}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Ionicons name="trophy" size={18} color={colors.accentInk} />
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={2}>
            {t('progress.records.liveNotice', { title })}
          </Text>
          <Text style={styles.exercise} numberOfLines={1}>
            {notice.exerciseName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = createStyles(() => ({
  overlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 420,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentInk,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  texts: {
    flexShrink: 1,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    ...typeScale.caption,
  },
  exercise: {
    color: colors.textMuted,
    ...typeScale.caption,
  },
}));
