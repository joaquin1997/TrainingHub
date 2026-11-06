import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExerciseWarmUpPreferences, WarmUpExerciseMetadata, WeightUnit } from '@workout/domain';

import { useAuth } from '@/features/auth/AuthContext';
import { exercisesClient } from '@/features/exercises/api/exercisesClient';
import { warmUpPreferenceStore } from '@/features/exercises/warmUpPreferences';
import type { ApproachSetsPreview, ApproachSetsPreviewResult } from '@/features/workouts/state/approachSetsDraft';
import { requestedApproachCount, warmUpIncrement, type WarmUpRampOptions } from '@/lib/approachSets';
import { DEFAULT_WARM_UP_PREFERENCES, resolveWarmUpContext } from '@/lib/warmUpContext';
import { toKg } from '@/lib/weight';
import { Button } from '@/ui/Button';
import { colors, commonStyles, createStyles, keyboardAppearance, radii, spacing, typeScale, useTheme } from '@/ui/theme';

type PreferenceSeed = { value: ExerciseWarmUpPreferences; pending: boolean };
export type WarmUpPreviewTarget = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  metadata?: WarmUpExerciseMetadata;
  preceding: WarmUpExerciseMetadata[];
  planned?: boolean;
  unit: WeightUnit;
  seed?: PreferenceSeed;
};
interface Props {
  target: WarmUpPreviewTarget | null;
  buildPreview: (context: WarmUpRampOptions) => ApproachSetsPreviewResult;
  onConfirm: (preview: ApproachSetsPreview) => void;
  onCancel: () => void;
  onSnapshot: (snapshot: PreferenceSeed) => void;
  onMetadata: (metadata: WarmUpExerciseMetadata) => void;
}

export function ApproachSetsPreviewSheet(props: Props) {
  useTheme();
  return (
    <Modal visible={props.target !== null} transparent animationType="fade" onRequestClose={props.onCancel}>
      {props.target ? <PreviewContent key={props.target.key} {...props} target={props.target} /> : null}
    </Modal>
  );
}

function PreviewContent({ target, buildPreview, onConfirm, onCancel, onSnapshot, onMetadata }: Omit<Props, 'target'> & { target: WarmUpPreviewTarget }) {
  useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const owner = user?.id ?? null;
  const insets = useSafeAreaInsets();
  const callbacks = useRef({ onSnapshot, onMetadata });
  callbacks.current = { onSnapshot, onMetadata };
  const snapshot = useSyncExternalStore(warmUpPreferenceStore.subscribe,
    () => warmUpPreferenceStore.snapshot(owner, target.exerciseId));
  const [metadata, setMetadata] = useState<WarmUpExerciseMetadata>(target.metadata ?? { name: target.exerciseName });
  const [incrementInput, setIncrementInput] = useState('');
  const [invalidIncrement, setInvalidIncrement] = useState(false);
  const context = resolveWarmUpContext(metadata, target.preceding, target.unit, snapshot.value);
  const preview = buildPreview(context);
  const increment = warmUpIncrement(target.unit, context);

  useEffect(() => {
    warmUpPreferenceStore.activate(owner);
    if (owner) void warmUpPreferenceStore.load(owner, target.exerciseId, target.seed);
    // One load on opening, including retrying a pending restored choice.
  }, [owner, target.exerciseId]);
  useEffect(() => {
    if (owner && snapshot.status !== 'idle') callbacks.current.onSnapshot({ value: snapshot.value, pending: snapshot.pending });
  }, [owner, snapshot.value, snapshot.pending, snapshot.status]);
  useEffect(() => {
    setIncrementInput(String(Number(increment.toFixed(6))));
    setInvalidIncrement(false);
  }, [increment]);
  useEffect(() => {
    if (target.metadata?.loadingKind && target.metadata.primaryMuscleGroups) return;
    let active = true;
    if (owner) void exercisesClient.getById(target.exerciseId).then((exercise) => {
      if (!active) return;
      const loaded: WarmUpExerciseMetadata = {
        name: exercise.name, aliases: exercise.aliases, loadingKind: exercise.loadingKind,
        category: exercise.category, equipment: exercise.equipment, primaryMuscleGroups: exercise.primaryMuscleGroups,
      };
      setMetadata(loaded); callbacks.current.onMetadata(loaded);
    }).catch(() => { /* Known local context remains sufficient offline. */ });
    return () => { active = false; };
  }, [owner, target.exerciseId]);

  const change = (patch: Partial<ExerciseWarmUpPreferences>) => {
    if (owner) void warmUpPreferenceStore.update(owner, target.exerciseId, { ...snapshot.value, ...patch });
  };
  const commitIncrement = () => {
    const value = Number(incrementInput.trim().replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) { setInvalidIncrement(true); return; }
    setInvalidIncrement(false);
    if (Math.abs(value - increment) > 1e-6) change({ incrementKg: toKg(value, target.unit) });
  };
  const disabled = snapshot.readOnly || !owner;
  const choice = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled}
      onPress={onPress} style={[styles.choice, selected ? styles.selected : null]}>
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  );

  return (
    <Pressable style={styles.backdrop} onPress={onCancel}>
      <Pressable accessible={false} onPress={(event) => event.stopPropagation()} style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>{t('workouts.approachPreviewTitle', { exercise: target.exerciseName })}</Text>
          <Text style={styles.caption}>{t('workouts.warmUpConfig.personal')}</Text>
          <Text style={styles.label}>{t('workouts.warmUpConfig.loadingKind')}</Text>
          <View style={styles.choices}>
            {(['barbell', 'dumbbell', 'machine'] as const).map((kind) => choice(kind, t(`workouts.warmUpConfig.${kind}`), context.loadingKind === kind, () => change({ loadingKind: kind })))}
          </View>
          <Text style={styles.caption}>{t(target.planned ? (context.alreadyWorked ? 'workouts.warmUpConfig.plannedAlready' : 'workouts.warmUpConfig.plannedNot') : (context.alreadyWorked ? 'workouts.warmUpConfig.alreadyWorked' : 'workouts.warmUpConfig.notWorked'))}</Text>
          <Text style={styles.label}>{t('workouts.warmUpConfig.count')}</Text>
          <View style={styles.choices}>
            {choice('auto', t('workouts.warmUpConfig.automatic'), snapshot.value.approachSetCount === null, () => change({ approachSetCount: null }))}
            {([1, 2, 3, 4, 5] as const).map((count) => choice(String(count), String(count), snapshot.value.approachSetCount === count, () => change({ approachSetCount: count })))}
          </View>
          <Text style={styles.label}>{t('workouts.warmUpConfig.increment', { unit: target.unit })}</Text>
          <TextInput accessibilityLabel={t('workouts.warmUpConfig.increment', { unit: target.unit })} editable={!disabled}
            value={incrementInput} onChangeText={(text) => { setIncrementInput(text); setInvalidIncrement(false); }} onBlur={commitIncrement}
            keyboardType="decimal-pad" keyboardAppearance={keyboardAppearance()} style={styles.input} />
          <View style={styles.choices}>
            {(target.unit === 'kg' ? [2.5, 5] : [5, 10]).map((step) => choice(`step-${step}`, `${step} ${target.unit}`, Math.abs(increment - step) < 1e-6,
              () => { setIncrementInput(String(step)); setInvalidIncrement(false); change({ incrementKg: toKg(step, target.unit) }); }))}
          </View>
          {invalidIncrement ? <Text accessibilityRole="alert" style={styles.error}>{t('workouts.warmUpConfig.invalidIncrement')}</Text> : null}
          <Button variant="ghost" label={t('workouts.warmUpConfig.reset')} disabled={disabled}
            onPress={() => { setIncrementInput(String(warmUpIncrement(target.unit, resolveWarmUpContext(metadata, target.preceding, target.unit)))); setInvalidIncrement(false); if (owner) void warmUpPreferenceStore.update(owner, target.exerciseId, DEFAULT_WARM_UP_PREFERENCES); }} />
          {snapshot.status === 'loading' || snapshot.status === 'saving' ? <Text style={styles.caption}>{t(snapshot.status === 'saving' ? 'workouts.warmUpConfig.saving' : 'workouts.warmUpConfig.loading')}</Text> : null}
          {snapshot.status === 'error' ? (
            <View>
              <Text accessibilityRole="alert" style={styles.error}>{t(snapshot.readOnly ? 'workouts.warmUpConfig.readOnly' : 'workouts.warmUpConfig.saveError')}</Text>
              {!snapshot.readOnly && owner ? <Button variant="secondary" label={t('common.retry')} onPress={() => { void warmUpPreferenceStore.load(owner, target.exerciseId); }} /> : null}
            </View>
          ) : null}
          {preview.outcome === 'preview' ? (
            <View style={styles.list}>
              <Text style={styles.caption}>{t('workouts.approachPreviewFrom', { weight: preview.workingWeight, unit: target.unit })}</Text>
              {preview.sets.map((set, index) => <Text key={index} style={styles.row}>{t('workouts.approachPreviewSet', { weight: Number(set.weight.toFixed(6)), unit: target.unit, reps: set.reps })}</Text>)}
              {preview.sets.length < requestedApproachCount(context) ? <Text style={styles.caption}>{t('workouts.warmUpConfig.fewerSets', { actual: preview.sets.length, requested: requestedApproachCount(context) })}</Text> : null}
              {preview.keptWarmUps > 0 ? <Text style={styles.caption}>{t('workouts.approachPreviewKept', { count: preview.keptWarmUps })}</Text> : null}
            </View>
          ) : <Text style={styles.caption}>{t(preview.outcome === 'noWeight' ? 'workouts.approachNoWeight' : 'workouts.approachTooLight')}</Text>}
          <View style={styles.actions}>
            <Button variant="secondary" label={t('common.cancel')} onPress={onCancel} style={styles.action} />
            <Button label={t('workouts.approachPreviewConfirm')} disabled={preview.outcome !== 'preview' || invalidIncrement}
              onPress={() => {
                const step = Number(incrementInput.trim().replace(',', '.'));
                if (!Number.isFinite(step) || step <= 0) { setInvalidIncrement(true); return; }
                const latest = buildPreview({ ...context, increment: step });
                if (latest.outcome === 'preview') {
                  if (Math.abs(step - increment) > 1e-6) change({ incrementKg: toKg(step, target.unit) });
                  onConfirm(latest);
                }
              }} style={styles.action} />
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

const styles = createStyles(() => ({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, maxHeight: '90%' },
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, ...typeScale.heading },
  label: { color: colors.text, ...typeScale.body, fontWeight: '600', marginTop: spacing.sm },
  caption: { color: colors.textMuted, ...typeScale.caption },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  choice: { minHeight: 44, minWidth: 44, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  selected: { borderColor: colors.accentInk, backgroundColor: colors.accentSoft },
  choiceText: { color: colors.text, ...typeScale.caption },
  input: { ...commonStyles.input },
  error: { color: colors.dangerInk, ...typeScale.caption },
  list: { gap: spacing.xs, paddingVertical: spacing.sm },
  row: { color: colors.text, ...typeScale.body, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flex: 1, minWidth: 120 },
}));
