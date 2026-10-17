export type ImageSource = { uri: string; headers?: Record<string, string> };

/**
 * The image source for an exercise's `imageUrl`: absolute catalog URLs are
 * used as they are; API-relative ones (a custom exercise's photo) resolve
 * against the API and carry the bearer token, because photos are served only
 * to signed-in users (spec 0026). Without a token a relative URL has no
 * source, so the caller shows the neutral tile.
 */
export function resolveImageSource(
  url: string,
  apiBaseUrl: string,
  token: string | null,
): ImageSource | null {
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) {
    return { uri: url };
  }

  if (!url.startsWith('/') || !token) {
    return null;
  }

  return {
    uri: `${apiBaseUrl.replace(/\/+$/, '')}${url}`,
    headers: { Authorization: `Bearer ${token}` },
  };
}
