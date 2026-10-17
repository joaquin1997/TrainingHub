import { View } from 'react-native';

import { WorkoutBar } from '@/features/workouts/components/WorkoutBar';
import { WorkoutSessionDetailScreen } from '@/features/workouts/screens/WorkoutSessionDetailScreen';

export default function WorkoutSessionDetailRoute() {
  return (
    <View style={{ flex: 1 }}>
      <WorkoutSessionDetailScreen />
      <WorkoutBar withBottomInset />
    </View>
  );
}
