import { Ionicons } from '@expo/vector-icons';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ShareCardModel } from '@/features/workouts/utils/shareCard';
import { colors, commonStyles, fonts, radii, spacing, typeScale } from '@/ui/theme';

/** The card's size in points (4:5); captured at 1080 × 1350 px. */
export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 450;

export type ShareCardRef = ComponentRef<typeof View>;

interface ShareCardProps {
  card: ShareCardModel;
  /** The view the share image is captured from. */
  ref?: Ref<ShareCardRef>;
}

/**
 * The share image of a workout (spec 0034 FR-25), drawn from tokens only.
 * Text does not follow the system text size (`allowFontScaling={false}`), so
 * the image is the same for everyone and always fits its fixed frame.
 * `collapsable={false}` keeps the view in the native tree for the capture.
 */
export function ShareCard({ card, ref }: ShareCardProps) {
  return (
    <View ref={ref} collapsable={false} style={styles.frame}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <View style={styles.mark}>
            <Ionicons name="pulse" size={22} color={colors.onPrimary} />
          </View>
          <View style={styles.headerText}>
            {card.title ? (
              <Text allowFontScaling={false} style={styles.title} numberOfLines={1}>
                {card.title}
              </Text>
            ) : null}
            <Text
              allowFontScaling={false}
              style={card.title ? styles.date : styles.title}
              numberOfLines={1}
            >
              {card.date}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          {card.stats.map((stat) => (
            <View key={stat.key} style={styles.stat}>
              <Text allowFontScaling={false} style={styles.statLabel} numberOfLines={1}>
                {stat.label}
              </Text>
              <Text allowFontScaling={false} style={styles.statValue} numberOfLines={1}>
                {stat.value}
                {stat.unit ? (
                  <Text allowFontScaling={false} style={styles.statUnit}>{` ${stat.unit}`}</Text>
                ) : null}
              </Text>
            </View>
          ))}
        </View>

        {card.records.length > 0 ? (
          <View style={styles.records}>
            {card.records.map((record, index) => (
              <View key={`${record.exerciseName}-${index}`} style={styles.line}>
                <Ionicons name="trophy" size={14} color={colors.accent} />
                <Text allowFontScaling={false} style={styles.recordText} numberOfLines={1}>
                  {`${record.exerciseName} · ${record.title}`}
                </Text>
                <Text allowFontScaling={false} style={styles.recordValue} numberOfLines={1}>
                  {record.value}
                </Text>
              </View>
            ))}
            {card.moreRecords ? (
              <Text allowFontScaling={false} style={styles.more}>
                {card.moreRecords}
              </Text>
            ) : null}
          </View>
        ) : null}

        {card.exercises.length > 0 ? (
          <View style={styles.exercises}>
            {card.exercises.map((exercise, index) => (
              <View key={`${exercise.name}-${index}`} style={styles.line}>
                <Text allowFontScaling={false} style={styles.exerciseName} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <Text allowFontScaling={false} style={styles.exerciseBest} numberOfLines={1}>
                  {exercise.best}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text allowFontScaling={false} style={styles.footerText}>
            {card.footer}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  panel: {
    flex: 1,
    gap: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...commonStyles.heading,
  },
  date: {
    ...typeScale.caption,
    color: colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  statLabel: {
    ...commonStyles.sectionLabel,
  },
  statValue: {
    ...typeScale.figure,
    color: colors.text,
  },
  statUnit: {
    ...typeScale.caption,
    color: colors.textMuted,
    fontFamily: fonts.display,
  },
  records: {
    gap: spacing.xs,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordText: {
    ...typeScale.caption,
    flex: 1,
    color: colors.text,
  },
  recordValue: {
    ...typeScale.caption,
    color: colors.accent,
    fontFamily: fonts.displayBold,
    fontVariant: ['tabular-nums'],
  },
  more: {
    ...typeScale.caption,
    color: colors.accent,
  },
  exercises: {
    gap: spacing.xs,
  },
  exerciseName: {
    ...typeScale.caption,
    flex: 1,
    color: colors.textMuted,
  },
  exerciseBest: {
    ...typeScale.caption,
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  footerText: {
    ...typeScale.caption,
    color: colors.textSubtle,
    textAlign: 'right',
  },
});
