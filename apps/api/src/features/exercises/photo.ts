export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type PhotoContentType = (typeof PHOTO_CONTENT_TYPES)[number];

export function isPhotoContentType(value: string): value is PhotoContentType {
  return (PHOTO_CONTENT_TYPES as readonly string[]).includes(value);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Whether the bytes really are the image type the request claims (magic numbers). */
export function matchesImageSignature(
  data: Buffer,
  contentType: PhotoContentType,
): boolean {
  switch (contentType) {
    case 'image/jpeg':
      return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    case 'image/png':
      return data.length > 8 && data.subarray(0, 8).equals(PNG_SIGNATURE);
    case 'image/webp':
      return (
        data.length > 12 &&
        data.subarray(0, 4).toString('ascii') === 'RIFF' &&
        data.subarray(8, 12).toString('ascii') === 'WEBP'
      );
  }
}

/** API-relative URL of an exercise's photo; `v` busts the client cache on change. */
export function photoImageUrl(exercisePublicId: string, updatedAt: Date) {
  return `/exercises/${exercisePublicId}/photo?v=${updatedAt.getTime()}`;
}
