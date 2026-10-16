import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { BodyMeasurementEntry, UserProfile } from '@workout/domain';

import { measurementsClient } from '@/features/profile/api/measurementsClient';
import { profileClient } from '@/features/profile/api/profileClient';

/**
 * Loads the person's profile (and, when asked, their measurement entries)
 * every time the screen gains focus, so edits made on a pushed screen show on
 * the way back.
 */
export function useProfileData({ withMeasurements = false }: { withMeasurements?: boolean } = {}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<BodyMeasurementEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      try {
        const [nextProfile, nextEntries] = await Promise.all([
          profileClient.get(),
          withMeasurements ? measurementsClient.list() : Promise.resolve([]),
        ]);
        if (shouldUpdate()) {
          setProfile(nextProfile);
          setEntries(nextEntries);
          setError(undefined);
        }
      } catch (loadError) {
        if (shouldUpdate()) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [withMeasurements],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void load(() => isActive);
      return () => {
        isActive = false;
      };
    }, [load]),
  );

  return { profile, setProfile, entries, isLoading, error, reload: load };
}
