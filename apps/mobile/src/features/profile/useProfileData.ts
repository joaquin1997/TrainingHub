import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { UserProfile } from '@workout/domain';

import { profileClient } from '@/features/profile/api/profileClient';

/**
 * Loads the person's profile every time the screen gains focus, so edits made
 * on a pushed screen show on the way back.
 */
export function useProfileData() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async (shouldUpdate: () => boolean = () => true) => {
    try {
      const nextProfile = await profileClient.get();
      if (shouldUpdate()) {
        setProfile(nextProfile);
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void load(() => isActive);
      return () => {
        isActive = false;
      };
    }, [load]),
  );

  return { profile, setProfile, isLoading, error, reload: load };
}
