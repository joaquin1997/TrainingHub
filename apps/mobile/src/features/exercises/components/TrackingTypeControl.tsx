import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { TRACKING_TYPES } from '@/lib/tracking';
import { Chip } from '@/ui/Chip';
import { colors, commonStyles, spacing, typeScale } from '@/ui/theme';
import type { ExerciseTrackingType } from '@workout/domain';

type TrackingTypeControlProps = {
  value: ExerciseTrackingType;
  onChange: (value: ExerciseTrackingType) => void;
  disabled?: boolean;
};

/**
 * "What each set records" on the exercise detail (spec 0030 FR-12): the same
 * five choices as when creating a custom exercise.
 */
export function TrackingTypeControl({ value, onChange, disabled }: TrackingTypeControlProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('customExercise.trackingTitle')}</Text>
      <View style={styles.options}>
        {TRACKING_TYPES.map((type) => (
          <Chip
            key={type}
            label={t(`customExercise.trackingTypes.${type}`)}
            selected={value === type}
            onPress={disabled || value === type ? undefined : () => onChange(type)}
          />
        ))}
      </View>
      <Text style={styles.hint}>{t('customExercise.trackingHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  label: {
    ...commonStyles.sectionLabel,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hint: {
    color: colors.textMuted,
    ...typeScale.caption,
  },
});
