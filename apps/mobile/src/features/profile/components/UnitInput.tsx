import { Text, TextInput, View } from 'react-native';

import { colors, commonStyles, createStyles, keyboardAppearance, spacing, useTheme } from '@/ui/theme';

interface UnitInputProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Display unit shown to the right, e.g. `kg`, `in`, `%`. */
  unit: string;
  label: string;
}

/** A decimal input with its unit set to the right. */
export function UnitInput({ value, onChangeText, unit, label }: UnitInputProps) {
  useTheme();
  return (
    <View style={styles.container}>
      <TextInput
        keyboardAppearance={keyboardAppearance()}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        style={[commonStyles.input, styles.field]}
        placeholder="–"
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel={`${label} (${unit})`}
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = createStyles(() => ({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
    // Lets the input shrink below its intrinsic width (web) inside narrow rows.
    minWidth: 0,
  },
  unit: {
    ...commonStyles.figureUnit,
    minWidth: 24,
  },
}));
