import { Share } from 'react-native';

/** Opens the share sheet. Cancelling or a failed share does nothing (spec 0028 EF-1). */
export async function shareWorkoutText(message: string): Promise<void> {
  try {
    await Share.share({ message });
  } catch {
    // The sheet reports its own problems.
  }
}
