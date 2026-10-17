import type { MeasurementRangeError, UpdateUserProfileInput } from '@workout/domain';

import { checkRange } from '../measurements/ranges.js';

export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 300;
/** Decoded size cap; the app sends a 512 px JPEG of a few tens of KB (EF-1). */
export const PHOTO_MAX_BYTES = 512 * 1024;

type Failure = { message: string } | MeasurementRangeError;
export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: Failure };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates a profile update. Absent fields stay unchanged; `null` (or an
 * empty bio) clears bio and height. The display name can change, never clear.
 */
export function parseProfileUpdate(body: unknown): ParseResult<UpdateUserProfileInput> {
  if (!isRecord(body)) {
    return { ok: false, error: { message: 'Invalid profile payload' } };
  }

  const value: UpdateUserProfileInput = {};

  if (body.displayName !== undefined) {
    const name = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    if (!name || name.length > DISPLAY_NAME_MAX) {
      return {
        ok: false,
        error: { message: `Display name must be 1 to ${DISPLAY_NAME_MAX} characters` },
      };
    }
    value.displayName = name;
  }

  if (body.bio !== undefined) {
    if (body.bio !== null && typeof body.bio !== 'string') {
      return { ok: false, error: { message: 'Bio must be text' } };
    }
    const bio = body.bio?.trim() ?? '';
    if (bio.length > BIO_MAX) {
      return { ok: false, error: { message: `Bio must be at most ${BIO_MAX} characters` } };
    }
    value.bio = bio || null;
  }

  if (body.heightCm !== undefined) {
    if (body.heightCm === null) {
      value.heightCm = null;
    } else {
      const height = typeof body.heightCm === 'number' ? body.heightCm : Number.NaN;
      const rangeError = checkRange('heightCm', height);
      if (rangeError) {
        return { ok: false, error: rangeError };
      }
      value.heightCm = height;
    }
  }

  return { ok: true, value };
}

export type PhotoResult =
  | { ok: true; bytes: Buffer }
  | { ok: false; status: 400 | 413; message: string };

/** Decodes a base64 JPEG upload, checking its magic bytes and size. */
export function decodeJpegBase64(body: unknown): PhotoResult {
  const raw = isRecord(body) && typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
  if (!raw || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    return { ok: false, status: 400, message: 'imageBase64 must be base64 JPEG data' };
  }

  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length > PHOTO_MAX_BYTES) {
    return { ok: false, status: 413, message: 'Photo is too large' };
  }
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return { ok: false, status: 400, message: 'Photo must be a JPEG image' };
  }

  return { ok: true, bytes };
}
