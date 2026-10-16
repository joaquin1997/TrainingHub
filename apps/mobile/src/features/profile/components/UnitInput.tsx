import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, commonStyles, spacing } from '@/ui/theme';

interface UnitInputProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Display unit shown to the right, e.g. `kg`, `in`, `%`. */
  unit: string;
  label: string;
}

/** A decimal input with its unit set to the right. */
export function UnitInput({ value, onChangeText, unit, label }: UnitInputProps) {
  return (
    <View style={styles.container}>
      <TextInput
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
  },
  unit: {
    ...commonStyles.figureUnit,
    minWidth: 24,
  },
});
