import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/ui/theme';

interface WarmUpActionButtonProps {
  /** Add (with a preview) or remove the generated warm-up sets (spec 0031). */
  action: 'add' | 'remove';
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The warm-up action as a toggle. The two states differ in icon shape (an
 * outlined flame vs a filled one with a ✕ badge) and in their spoken label,
 * not in colour alone (spec 0031 FR-12).
 */
export function WarmUpActionButton({ action, onPress, style }: WarmUpActionButtonProps) {
  const { t } = useTranslation();
  const removing = action === 'remove';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        removing ? t('workouts.removeGeneratedWarmUps') : t('workouts.addApproachSets')
      }
      onPress={onPress}
      hitSlop={6}
      style={style}
    >
      <Ionicons
        name={removing ? 'flame' : 'flame-outline'}
        size={18}
        color={removing ? colors.accent : colors.textMuted}
      />
      {removing ? (
        <View style={styles.badge} pointerEvents="none">
          <Ionicons name="close" size={9} color={colors.text} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 13,
    height: 13,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});
