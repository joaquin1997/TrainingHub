import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { PROFILE_PHOTO_SIZE, squareCrop } from './squareCrop';

/**
 * The one place that reaches the image picker and resizer (Article 6). Lets
 * the person choose a photo from the library, crops it square and reduces it
 * to a small JPEG before upload, so a large photo is shrunk, never rejected
 * (spec 0027 EF-1).
 *
 * Resolves to the JPEG as base64 (no data-URL prefix), or `null` when the
 * person cancels.
 */
export async function pickProfilePhoto(): Promise<string | null> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) {
    return null;
  }

  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width && asset.height) {
    context.crop(squareCrop(asset.width, asset.height));
  }
  const side = Math.min(asset.width || PROFILE_PHOTO_SIZE, asset.height || PROFILE_PHOTO_SIZE);
  if (side > PROFILE_PHOTO_SIZE) {
    context.resize({ width: PROFILE_PHOTO_SIZE, height: PROFILE_PHOTO_SIZE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });

  if (!saved.base64) {
    throw new Error('The photo could not be read.');
  }
  // Web returns a full data URL; native returns bare base64.
  return saved.base64.replace(/^data:image\/\w+;base64,/, '');
}
