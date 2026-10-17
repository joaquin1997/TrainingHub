import type { EntityId, ISODateString } from './entities.js';

/**
 * The signed-in person's own profile (spec 0027). Private to its owner.
 * Height is canonical centimetres; the photo travels inline as a small
 * `data:image/jpeg;base64,...` URL.
 */
export interface UserProfile {
  displayName: string;
  email: string | null;
  bio: string | null;
  heightCm: number | null;
  photoDataUrl: string | null;
}

/** Partial profile update. `null` clears bio or height; absent leaves it. */
export interface UpdateUserProfileInput {
  displayName?: string;
  bio?: string | null;
  heightCm?: number | null;
}

/** A profile photo upload: JPEG bytes, base64-encoded (no data-URL prefix). */
export interface SetProfilePhotoInput {
  imageBase64: string;
}

/**
 * The body measurements an entry may carry. Body weight is canonical kg,
 * every length canonical cm (Article 4, extended to lengths), percentages
 * as entered.
 */
export type BodyMeasurementKey =
  | 'weightKg'
  | 'bodyFatPercent'
  | 'musclePercent'
  | 'neckCm'
  | 'chestCm'
  | 'waistCm'
  | 'hipsCm'
  | 'armCm'
  | 'forearmCm'
  | 'thighCm'
  | 'calfCm';

/** Any subset of the measurements; absent or `null` means "not measured". */
export type BodyMeasurementValues = Partial<Record<BodyMeasurementKey, number | null>>;

/** A dated record of body measurements, owned by one user. */
export interface BodyMeasurementEntry extends BodyMeasurementValues {
  id: EntityId;
  /** Date and time of the measurement; orders same-day entries. */
  measuredAt: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Create or (full) replace of a measurement entry. */
export interface BodyMeasurementInput extends BodyMeasurementValues {
  measuredAt: ISODateString;
}

/**
 * 400 body when a value is outside its plausible range. `min`/`max` are in
 * the field's canonical unit, so the client can show them in its own.
 */
export interface MeasurementRangeError {
  message: string;
  field: BodyMeasurementKey | 'heightCm';
  min: number;
  max: number;
}
