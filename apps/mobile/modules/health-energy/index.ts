import { requireOptionalNativeModule } from 'expo';

type HealthEnergyNative = {
  isAvailable(): boolean;
  requestReadAuthorization(): Promise<boolean>;
  /** Null for no data or no permission; rejects when Health cannot be read now. */
  activeEnergyKcal(startMs: number, endMs: number): Promise<number | null>;
};

/** Null on platforms without the native module (Android, web, Expo Go). */
export const HealthEnergy =
  requireOptionalNativeModule<HealthEnergyNative>('HealthEnergy');
