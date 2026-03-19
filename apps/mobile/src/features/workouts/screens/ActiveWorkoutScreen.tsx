import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RouteLinks } from '@/features/navigation/components/RouteLinks';
import {
  notifyAppleWorkoutFinished,
  notifyAppleWorkoutStarted,
  syncWorkoutCompletionToAppleHealth,
} from '@/features/health/integrations/appleWorkoutIntegration';
import {
  createWorkoutSessionDraft,
  saveCompletedWorkout,
  toWorkoutSessionSkeleton,
  updateWorkoutSetDraft,
} from '@/features/workouts/state/workoutDraftStore';

export function ActiveWorkoutScreen() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const [workoutDraft, setWorkoutDraft] = useState(() =>
    createWorkoutSessionDraft(routineId),
  );

  if (!workoutDraft) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Active Workout</Text>
        <Text style={styles.body}>
          Start this flow from a routine so the workout session can be created
          from a routine template.
        </Text>
        <Link href="/routines" style={styles.link}>
          Back to routines
        </Link>
        <RouteLinks currentRoute="active-workout" />
      </View>
    );
  }

  useEffect(() => {
    void notifyAppleWorkoutStarted(workoutDraft);
  }, [workoutDraft]);

  const finishWorkout = () => {
    const workoutSession = toWorkoutSessionSkeleton(workoutDraft);

    saveCompletedWorkout(workoutDraft);

    // TODO: Replace local in-memory workout completion with backend persistence.
    void notifyAppleWorkoutFinished(
      workoutDraft,
      workoutSession.completedAt ?? workoutSession.updatedAt,
    );
    void syncWorkoutCompletionToAppleHealth(workoutSession);
    router.push('/workouts/summary');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Active Workout</Text>
      <Text style={styles.body}>
        {workoutDraft.routineName}
      </Text>
      <Text style={styles.meta}>
        Started from routine template. Actual workout values stay local to this
        screen for now.
      </Text>
      {workoutDraft.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <Text style={styles.cardTitle}>{exercise.exerciseName}</Text>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>
              {exercise.imagePlaceholderText ?? 'Image placeholder'}
            </Text>
          </View>
          <Text style={styles.target}>
            Targets: {exercise.entries.length} sets with per-set reps and weight
            goals.
          </Text>
          <View style={styles.setList}>
            {exercise.entries.map((set) => (
              <View key={set.id} style={styles.setCard}>
                <Text style={styles.setTitle}>Set {set.order}</Text>
                <Text style={styles.setTarget}>
                  Target: {set.minReps ?? '?'}-{set.maxReps ?? '?'} reps
                  {set.targetWeight !== undefined ? `, ${set.targetWeight} kg` : ''}
                </Text>
                <View style={styles.inputsRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Actual reps</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={set.reps}
                      onChangeText={(value) => {
                        setWorkoutDraft((currentDraft) =>
                          currentDraft
                            ? updateWorkoutSetDraft(
                                currentDraft,
                                exercise.id,
                                set.id,
                                'reps',
                                value,
                              )
                            : currentDraft,
                        );
                      }}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Actual kg</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={set.weightKg}
                      onChangeText={(value) => {
                        setWorkoutDraft((currentDraft) =>
                          currentDraft
                            ? updateWorkoutSetDraft(
                                currentDraft,
                                exercise.id,
                                set.id,
                                'weightKg',
                                value,
                              )
                            : currentDraft,
                        );
                      }}
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
      <Pressable onPress={finishWorkout} style={styles.button}>
        <Text style={styles.buttonText}>Finish workout</Text>
      </Pressable>
      <Text style={styles.todo}>
        TODO: Add timers, backend sync, and live workout persistence when the
        execution flow is expanded.
      </Text>
      <Text style={styles.todo}>
        TODO: Apple Health completion sync and Apple Watch live mirroring hook
        into this screen through isolated Apple-specific integration stubs.
      </Text>
      <RouteLinks currentRoute="active-workout" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  body: {
    fontSize: 24,
    fontWeight: '600',
  },
  meta: {
    fontSize: 14,
    color: '#4b5563',
  },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 84,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#4b5563',
  },
  target: {
    fontSize: 14,
    lineHeight: 22,
  },
  setList: {
    gap: 8,
  },
  setCard: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  setTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  setTarget: {
    fontSize: 13,
    color: '#4b5563',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    color: '#4b5563',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  todo: {
    fontSize: 14,
    color: '#4b5563',
  },
  link: {
    fontSize: 15,
    color: '#2563eb',
  },
});
