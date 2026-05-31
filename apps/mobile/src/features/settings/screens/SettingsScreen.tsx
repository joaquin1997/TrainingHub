import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/features/settings/SettingsContext';
import { formatDuration } from '@/lib/format';
import { colors, commonStyles, radii, spacing } from '@/ui/theme';
import type { WeightUnit } from '@workout/domain';

const UNITS: WeightUnit[] = ['kg', 'lb'];

export function SettingsScreen() {
  const { settings, update } = useSettings();

  const changeRest = (delta: number) =>
    update({
      defaultRestSeconds: Math.max(15, settings.defaultRestSeconds + delta),
    });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weight unit</Text>
        <View style={styles.segment}>
          {UNITS.map((unit) => {
            const active = settings.unit === unit;
            return (
              <Pressable
                key={unit}
                onPress={() => update({ unit })}
                style={[styles.segmentItem, active ? styles.segmentItemActive : null]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    active ? styles.segmentTextActive : null,
                  ]}
                >
                  {unit.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>Used across logging, history and progress.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default rest timer</Text>
        <View style={styles.stepperRow}>
          <Pressable
            onPress={() => changeRest(-15)}
            hitSlop={6}
            style={styles.stepButton}
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.restValue}>
            {formatDuration(settings.defaultRestSeconds)}
          </Text>
          <Pressable
            onPress={() => changeRest(15)}
            hitSlop={6}
            style={styles.stepButton}
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          Pre-fills the rest timer when you start a workout.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...commonStyles.screen,
  },
  container: {
    ...commonStyles.scrollContent,
  },
  section: {
    ...commonStyles.card,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  segmentItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.onPrimary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  stepButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  stepText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  restValue: {
    minWidth: 64,
    textAlign: 'center',
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
