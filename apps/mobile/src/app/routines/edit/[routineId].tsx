import { useLocalSearchParams } from 'expo-router';

import { RoutineFormScreen } from '@/features/routines/screens/RoutineFormScreen';

export default function EditRoutineRoute() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();

  return <RoutineFormScreen mode="edit" routineId={routineId} />;
}

