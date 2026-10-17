import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ExerciseThumb } from '@/features/exercises/components/ExerciseThumb';
import { pickProfilePhoto } from '@/features/profile/photo/pickProfilePhoto';
import { Button } from '@/ui/Button';
import { colors, spacing, typeScale } from '@/ui/theme';

type ExercisePhotoFieldProps = {
  /** The chosen photo as base64 JPEG (no data-URL prefix), or undefined. */
  photoBase64?: string;
  /** The photo already saved on the exercise, shown until a new one is chosen. */
  currentImageUrl?: string;
  onChange: (photoBase64: string | undefined) => void;
  disabled?: boolean;
};

/**
 * Picks a photo for a custom exercise from the library (spec 0026 FR-2). The
 * choice is only held here; the host uploads it once the exercise exists.
 */
export function ExercisePhotoField({
  photoBase64,
  currentImageUrl,
  onChange,
  disabled,
}: ExercisePhotoFieldProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string>();

  async function handlePick() {
    try {
      setError(undefined);
      const picked = await pickProfilePhoto();
      if (picked) {
        onChange(picked);
      }
    } catch {
      setError(t('customExercise.photoError'));
    }
  }

  const preview = photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : currentImageUrl;

  return (
    <View style={styles.row}>
      <ExerciseThumb imageUrl={preview} size={64} />
      <View style={styles.actions}>
        <Button
          label={preview ? t('customExercise.changePhoto') : t('customExercise.addPhoto')}
          icon="image-outline"
          variant="secondary"
          disabled={disabled}
          onPress={() => void handlePick()}
        />
        {photoBase64 ? (
          <Button
            label={t('customExercise.removePhoto')}
            variant="ghost"
            disabled={disabled}
            onPress={() => onChange(undefined)}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actions: {
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  error: {
    color: colors.danger,
    ...typeScale.caption,
  },
});
