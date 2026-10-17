import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  ShareCard,
  type ShareCardRef,
} from '@/features/workouts/components/ShareCard';
import { captureAndShare, shareImageAvailable } from '@/features/workouts/share/shareImage';
import type { ShareCardModel } from '@/features/workouts/utils/shareCard';
import { Button } from '@/ui/Button';
import { colors, createStyles, fonts, radii, spacing, typeScale, useTheme } from '@/ui/theme';

interface ShareSheetProps {
  visible: boolean;
  card: ShareCardModel;
  /** The text share of 0028, unchanged. */
  onShareText: () => void;
  onClose: () => void;
}

/** Share of the window height the preview may take, so the actions stay in view. */
const PREVIEW_MAX_HEIGHT_RATIO = 0.5;

/**
 * Share a workout (spec 0034 FR-25): the image card's preview with **Share
 * image** — hidden on web and on a build without the native modules — and
 * **Share as text** (0028). A failed image says so in one line and the text
 * action keeps working (EF-6).
 */
export function ShareSheet({ visible, card, onShareText, onClose }: ShareSheetProps) {
  useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const cardRef = useRef<ShareCardRef>(null);
  const [status, setStatus] = useState<'idle' | 'busy' | 'failed'>('idle');
  const imageAvailable = shareImageAvailable();

  useEffect(() => {
    if (visible) {
      setStatus('idle');
    }
  }, [visible]);

  // The preview is the card itself, scaled to fit; the capture reads the
  // unscaled card inside the scaled wrapper.
  const scale = Math.min(
    1,
    (window.width - spacing.lg * 2) / SHARE_CARD_WIDTH,
    (window.height * PREVIEW_MAX_HEIGHT_RATIO) / SHARE_CARD_HEIGHT,
  );

  const shareImage = async () => {
    setStatus('busy');
    const result = await captureAndShare(cardRef, { dialogTitle: t('workouts.share.sheetTitle') });
    setStatus(result === 'failed' ? 'failed' : 'idle');
    if (result === 'shared') {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.grabber} />
          <Text style={styles.title}>{t('workouts.share.sheetTitle')}</Text>
          <View
            style={[
              styles.preview,
              { width: SHARE_CARD_WIDTH * scale, height: SHARE_CARD_HEIGHT * scale },
            ]}
            accessible
            accessibilityRole="image"
            accessibilityLabel={[card.title, card.date].filter(Boolean).join(', ')}
          >
            <View
              style={[
                styles.scaled,
                {
                  left: (SHARE_CARD_WIDTH * scale - SHARE_CARD_WIDTH) / 2,
                  top: (SHARE_CARD_HEIGHT * scale - SHARE_CARD_HEIGHT) / 2,
                  transform: [{ scale }],
                },
              ]}
            >
              <ShareCard ref={cardRef} card={card} />
            </View>
          </View>
          {status === 'failed' ? (
            <View style={styles.failure} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.failureText}>{t('workouts.share.imageFailed')}</Text>
            </View>
          ) : null}
          {imageAvailable ? (
            <Button
              label={t('workouts.share.image')}
              icon="image-outline"
              fullWidth
              disabled={status === 'busy'}
              onPress={() => void shareImage()}
            />
          ) : null}
          <Button
            label={t('workouts.share.asText')}
            icon="document-text-outline"
            variant={imageAvailable ? 'secondary' : 'primary'}
            fullWidth
            onPress={() => {
              onClose();
              onShareText();
            }}
          />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            style={styles.cancel}
            onPress={onClose}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = createStyles(() => ({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
  },
  title: {
    ...typeScale.body,
    color: colors.text,
    fontFamily: fonts.displayBold,
  },
  preview: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: radii.md,
  },
  scaled: {
    position: 'absolute',
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
  },
  failure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  failureText: {
    ...typeScale.caption,
    flex: 1,
    color: colors.text,
  },
  cancel: {
    alignSelf: 'center',
  },
}));
