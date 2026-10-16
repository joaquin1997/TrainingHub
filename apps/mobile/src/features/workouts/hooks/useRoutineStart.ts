import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout';
import { countWorkoutSets } from '@/features/workouts/state/workoutDraftStore';
import {
  resolveRoutineStart,
  resolveSwitchOutcome,
} from '@/features/workouts/utils/activeWorkoutEntry';
import type { ActionSheet } from '@/ui/ActionSheet';

interface RoutineRef {
  id: string;
  name: string;
}

/**
 * Start a routine from a routines screen (spec 0019). With another workout in
 * progress it asks first, naming both (FR-3); the screen renders `sheet` in an
 * `ActionSheet`. "Finish and start" itself runs on the workout screen, so a
 * failed save shows there exactly as on finish (EF-1).
 */
export function useRoutineStart() {
  const { t } = useTranslation();
  const router = useRouter();
  const activeWorkout = useActiveWorkout();
  const [nextRoutine, setNextRoutine] = useState<RoutineRef | null>(null);

  const startRoutine = (routine: RoutineRef) => {
    switch (resolveRoutineStart(activeWorkout, routine.id)) {
      case 'start':
        router.push({ pathname: '/workouts/active', params: { routineId: routine.id } });
        return;
      case 'open':
        router.push('/workouts/active');
        return;
      case 'ask':
        setNextRoutine(routine);
    }
  };

  const asking = nextRoutine !== null && activeWorkout !== null;
  const current = activeWorkout?.routineName ?? '';
  const outcome = activeWorkout ? resolveSwitchOutcome(activeWorkout) : 'discard';

  const sheet: ComponentProps<typeof ActionSheet> = {
    visible: asking,
    title: t('workouts.switchTitle'),
    message: asking
      ? outcome === 'save'
        ? t('workouts.switchSaves', {
            current,
            count: countWorkoutSets(activeWorkout).done,
          })
        : t('workouts.switchDiscards', { current })
      : undefined,
    actions: asking
      ? [
          {
            label: t('workouts.switchFinishAndStart', {
              current,
              next: nextRoutine.name,
            }),
            destructive: outcome === 'discard',
            onPress: () =>
              router.push({
                pathname: '/workouts/active',
                params: { action: 'switch', nextRoutineId: nextRoutine.id },
              }),
          },
          {
            label: t('workouts.switchBack', { current }),
            onPress: () => router.push('/workouts/active'),
          },
        ]
      : [],
    onClose: () => setNextRoutine(null),
  };

  return { startRoutine, sheet };
}
