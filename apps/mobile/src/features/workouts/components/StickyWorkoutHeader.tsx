import { Ionicons } from '@expo/vector-icons';
import type { WeightUnit } from '@workout/domain';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import {
  upNextTargetLabel,
  type StickyHeaderModel,
} from '@/features/workouts/utils/stickyHeader';
import { Chip } from '@/ui/Chip';
import { colors, createStyles, fonts, fontScaleCap, spacing, typeScale, useTheme } from '@/ui/theme';
import { useReducedMotion } from '@/ui/useReducedMotion';

/** Fade of the compact header (spec 0034 FR-21); instant under Reduce Motion (FR-9). */
export const STICKY_HEADER_FADE_MS = 150;

type Props = {
  /** Shown once the full header card has scrolled out of view. */
  visible: boolean;
  /** The workout clock, already formatted. */
  clock: string;
  paused: boolean;
  model: StickyHeaderModel;
  unit: WeightUnit;
  onPressUpNext: (workoutSetId: string) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

/**
 * The compact workout header (spec 0034 FR-21): the clock (and its paused
 * state), the round of the superset in progress, and the set to do now with
 * its target. Tapping the set scrolls the list to it. It sits over the top of
 * the list while the full header card is out of view; the rest bar stays at
 * the bottom (0018).
 */
export function StickyWorkoutHeader({
  visible,
  clock,
  paused,
  model,
  unit,
  onPressUpNext,
  onLayout,
}: Props) {
  useTheme();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(visible ? 1 : 0);
      return;
    }
    const animation = Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: STICKY_HEADER_FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, opacity, reducedMotion]);

  const { upNext, round } = model;
  const setText = upNext
    ? upNext.isWarmup
      ? t('workouts.stickyHeader.warmup')
      : t('workouts.stickyHeader.set', { number: upNext.setNumber })
    : '';
  const target = upNext ? upNextTargetLabel(upNext.values, unit) : null;
  // A wrap never splits "60 kg × 8" (EF-8: the line grows instead).
  const detail = upNext
    ? [upNext.blockLabel, setText, target?.replace(/ /g, ' ')]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      onLayout={onLayout}
      style={[styles.bar, { opacity }]}
    >
      <View style={styles.status}>
        <View style={styles.clockRow}>
          <Text
            maxFontSizeMultiplier={fontScaleCap.fixedColumn}
            style={[styles.clock, paused ? styles.clockPaused : null]}
          >
            {clock}
          </Text>
          {paused ? <Text style={styles.paused}>{t('workouts.paused')}</Text> : null}
        </View>
        {round ? (
          <Chip
            tone="primary"
            size="sm"
            label={t('supersets.roundOf', { current: round.current, total: round.total })}
          />
        ) : null}
      </View>
      {upNext ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[
            t('workouts.stickyHeader.upNext'),
            upNext.exerciseName,
            setText,
            target,
          ]
            .filter(Boolean)
            .join(', ')}
          accessibilityHint={t('workouts.stickyHeader.scrollHint')}
          onPress={() => onPressUpNext(upNext.workoutSetId)}
          style={({ pressed }) => [styles.upNext, pressed ? styles.upNextPressed : null]}
        >
          <View style={styles.upNextTexts}>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {upNext.exerciseName}
            </Text>
            <Text style={styles.detail}>
              <Text style={styles.upNextWord}>{t('workouts.stickyHeader.upNext')}</Text>
              {` · ${detail}`}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
      ) : (
        <View style={styles.upNext}>
          <Ionicons name="checkmark-done" size={18} color={colors.successInk} />
          <Text style={styles.allDone}>{t('workouts.stickyHeader.allDone')}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = createStyles(() => ({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  status: {
    alignItems: 'flex-start',
    gap: spacing.xxs,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  clock: {
    ...typeScale.figure,
    color: colors.primaryInk,
  },
  clockPaused: {
    color: colors.textMuted,
  },
  paused: {
    color: colors.textMuted,
    ...typeScale.caption,
    fontWeight: '700',
  },
  upNext: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 160,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  upNextPressed: {
    opacity: 0.7,
  },
  upNextTexts: {
    flex: 1,
    minWidth: 0,
  },
  exerciseName: {
    color: colors.text,
    ...typeScale.body,
    fontWeight: '700',
  },
  detail: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    ...typeScale.caption,
    fontVariant: ['tabular-nums'],
  },
  upNextWord: {
    color: colors.primaryInk,
    fontFamily: fonts.displayBold,
  },
  allDone: {
    color: colors.text,
    ...typeScale.body,
    fontWeight: '700',
  },
}));
