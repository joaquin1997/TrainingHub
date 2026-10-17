import { useEffect, useState, type ReactNode } from 'react';
import { Image, type ImageStyle, Platform, type StyleProp } from 'react-native';

import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/http';
import { type ImageSource, resolveImageSource } from '@/lib/imageSource';

type ExerciseImageProps = {
  imageUrl?: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover';
  accessibilityLabel?: string;
  /** Shown without an image and when it fails to load (spec 0026 FR-4, EF-1). */
  fallback: ReactNode;
};

/**
 * Web's `<img>` cannot send an Authorization header (native `Image` can), so
 * there an authenticated image is fetched and shown from a blob URL.
 */
function useWebAuthenticatedUri(source: ImageSource | null) {
  const needsFetch = Platform.OS === 'web' && Boolean(source?.headers);
  const [blobUri, setBlobUri] = useState<string>();
  const [blobFailed, setBlobFailed] = useState(false);
  const uri = source?.uri;
  const authorization = source?.headers?.Authorization;

  useEffect(() => {
    if (!needsFetch || !uri || !authorization) {
      return;
    }
    let objectUrl: string | undefined;
    let active = true;
    setBlobUri(undefined);
    setBlobFailed(false);
    void fetch(uri, { headers: { Authorization: authorization } })
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error('image'))))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setBlobUri(objectUrl);
        }
      })
      .catch(() => active && setBlobFailed(true));

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [needsFetch, uri, authorization]);

  if (!needsFetch) {
    return { source, ready: true };
  }
  return { source: blobUri ? { uri: blobUri } : null, ready: !blobFailed && Boolean(blobUri) };
}

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

  const resolved = imageUrl ? resolveImageSource(imageUrl, API_BASE_URL, getAuthToken()) : null;
  const { source, ready } = useWebAuthenticatedUri(resolved);

  if (!source || !ready || failed) {
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
