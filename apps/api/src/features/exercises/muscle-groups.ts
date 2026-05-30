export function normalizeMuscleGroupName(value: string) {
  return value.trim().toLowerCase();
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

export function normalizeMuscleGroupNames(values: string[]) {
  return dedupe(
    values
      .map(normalizeMuscleGroupName)
      .filter((value) => value.length > 0),
  );
}

export function splitExerciseMuscleGroups(
  primaryValues: string[],
  secondaryValues: string[],
) {
  const primaryMuscleGroups = normalizeMuscleGroupNames(primaryValues);
  const primaryMuscleGroupSet = new Set(primaryMuscleGroups);
  const secondaryMuscleGroups = normalizeMuscleGroupNames(secondaryValues).filter(
    (value) => !primaryMuscleGroupSet.has(value),
  );

  return {
    primaryMuscleGroups,
    secondaryMuscleGroups,
  };
}
