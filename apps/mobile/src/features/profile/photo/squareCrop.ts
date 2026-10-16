/** Edge of the stored profile photo, in pixels (spec 0027 EF-1). */
export const PROFILE_PHOTO_SIZE = 512;

/**
 * The centred square of a `width` × `height` image. The iOS/Android picker
 * already crops to a square; web cannot, so the photo is always cropped here.
 */
export function squareCrop(width: number, height: number) {
  const side = Math.min(width, height);
  return {
    originX: Math.floor((width - side) / 2),
    originY: Math.floor((height - side) / 2),
    width: side,
    height: side,
  };
}
