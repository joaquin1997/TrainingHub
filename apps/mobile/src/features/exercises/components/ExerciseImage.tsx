import { useEffect, useState, type ReactNode } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/http';
import { resolveImageSource } from '@/lib/imageSource';

type ExerciseImageProps = {
  imageUrl?: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover';
  accessibilityLabel?: string;
  /** Shown without an image and when it fails to load (spec 0026 FR-4, EF-1). */
  fallback: ReactNode;
};

/** An exercise's image (catalog URL or own photo), or `fallback` when missing or broken. */
export function ExerciseImage({
  imageUrl,
  style,
  resizeMode = 'contain',
  accessibilityLabel,
  fallback,
}: ExerciseImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const source = imageUrl ? resolveImageSource(imageUrl, API_BASE_URL, getAuthToken()) : null;

  if (!source || failed) {
    return <>{fallback}</>;
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      accessibilityLabel={accessibilityLabel}
      onError={() => setFailed(true)}
    />
  );
}
