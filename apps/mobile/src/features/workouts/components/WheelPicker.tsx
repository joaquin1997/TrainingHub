import { type ComponentRef, useEffect, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, typeScale } from '@/ui/theme';

const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 3;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);

interface WheelPickerProps {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  formatItem?: (value: number) => string;
}

/**
 * iOS-style spinning wheel built from a snapping ScrollView (no native picker
 * dependency). Renders an odd number of rows and selects the centered one;
 * tapping a row selects it too (also where scroll momentum is not reported,
 * e.g. on the web).
 */
export function WheelPicker({
  values,
  value,
  onChange,
  formatItem,
}: WheelPickerProps) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const index = Math.max(0, values.indexOf(value));

  // Keep the wheel aligned when the value changes from outside (e.g. presets).
  useEffect(() => {
    ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
  }, [index]);

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const nextIndex = Math.max(
      0,
      Math.min(values.length - 1, Math.round(offsetY / ITEM_HEIGHT)),
    );
    const next = values[nextIndex]!;
    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.selectionBand} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: index * ITEM_HEIGHT }}
        contentContainerStyle={styles.content}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {values.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: item === value }}
            onPress={() => {
              if (item !== value) {
                onChange(item);
              }
            }}
            style={styles.row}
          >
            <Text style={[styles.item, item === value ? styles.itemActive : null]}>
              {formatItem ? formatItem(item) : String(item)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: ITEM_HEIGHT * VISIBLE_ROWS,
  },
  content: {
    paddingVertical: PAD,
  },
  row: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    color: colors.textSubtle,
    // Figure size in the system face; the wheel fixes the row height itself.
    fontSize: typeScale.figure.fontSize,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  itemActive: {
    color: colors.text,
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PAD,
    height: ITEM_HEIGHT,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
});
