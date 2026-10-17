import { useTranslation } from 'react-i18next';
import { Switch, Text, View } from 'react-native';

import { colors, commonStyles, createStyles, spacing, typeScale, useTheme } from '@/ui/theme';

type UnilateralSwitchProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

/**
 * "Left and right": marks an exercise as done one side at a time, so its
 * sets record left and right reps (spec 0022 FR-1). Used when creating a
 * custom exercise and on any exercise's detail.
 */
export function UnilateralSwitch({ value, onChange, disabled }: UnilateralSwitchProps) {
  useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.label}>{t('customExercise.unilateralTitle')}</Text>
        <Text style={styles.hint}>{t('customExercise.unilateralHint')}</Text>
      </View>
      <Switch
        accessibilityLabel={t('customExercise.unilateralTitle')}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.text}
      />
    </View>
  );
}

const styles = createStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    ...commonStyles.sectionLabel,
  },
  hint: {
    color: colors.textMuted,
    ...typeScale.caption,
  },
}));
