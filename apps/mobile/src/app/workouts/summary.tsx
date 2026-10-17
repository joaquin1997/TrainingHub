import { View } from 'react-native';

import { WorkoutBar } from '@/features/workouts/components/WorkoutBar';
import { WorkoutSummaryScreen } from '@/features/workouts/screens/WorkoutSummaryScreen';

export default function WorkoutSummaryRoute() {
  return (
    <View style={{ flex: 1 }}>
      <WorkoutSummaryScreen />
      <WorkoutBar withBottomInset />
    </View>
  );
}

