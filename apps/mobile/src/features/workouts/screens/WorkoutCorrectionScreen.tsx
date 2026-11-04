import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Stack, useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { correctionFields } from '@workout/domain/workoutCorrections';
import { useAuth } from '@/features/auth/AuthContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { workoutsClient } from '../api/workoutsClient';
import { correctionStore } from '../corrections/correctionStore';
import { correctionIsDirty, createCorrectionDraft, type WorkoutCorrectionDraft } from '../corrections/correctionDraft';
import { saveCorrection } from '../corrections/saveCorrection';
import { createWorkoutClientId } from '../state/workoutDraftStore';
import { ApiError, getAuthToken } from '@/lib/http';
import { confirmAction } from '@/lib/confirmAction';
import { formatDayHeading } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { StateView } from '@/ui/StateView';
import { colors, commonStyles, createStyles, keyboardAppearance, spacing, typeScale, useTheme } from '@/ui/theme';

export function WorkoutCorrectionScreen() {
  useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const { workoutId = '' } = useLocalSearchParams<{ workoutId: string }>();
  const ownerId = user?.id ?? '';
  const token = getAuthToken();
  const entry = useSyncExternalStore(correctionStore.subscribe,
    useCallback(() => correctionStore.get(ownerId, workoutId), [ownerId, workoutId]), () => null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [unsupported, setUnsupported] = useState(false);
  const [allowLeave, setAllowLeave] = useState(false);
  const [leavePrompt, setLeavePrompt] = useState(false);
  const repeat = useRef<(() => void) | null>(null);
  const disablePrevention = usePreventRemove(!allowLeave && !!ownerId && !!entry && (entry.saving || correctionIsDirty(entry.draft)), ({ repeat: next }) => {
    if (entry?.saving) return;
    repeat.current = next; setLeavePrompt(true);
  });
  useEffect(() => {
    setLoadError(false); setUnsupported(false);
    if (!ownerId || !workoutId || correctionStore.get(ownerId, workoutId)) return;
    let active = true;
    void workoutsClient.getById(workoutId).then((session) => {
      if (!active || getAuthToken() !== token) return;
      if (session.userId !== ownerId) { setLoadError(true); return; }
      if (!Number.isSafeInteger(session.revision)) { setUnsupported(true); return; }
      correctionStore.set(ownerId, workoutId, { draft: createCorrectionDraft(session, ownerId, settings.unit), saving: false });
    }).catch(() => { if (active && getAuthToken() === token) setLoadError(true); });
    return () => { active = false; };
  }, [ownerId, workoutId, token, reload]);

  const leave = () => { setAllowLeave(true); setLeavePrompt(false); disablePrevention(); if (repeat.current) repeat.current(); else router.back(); };
  const save = async () => {
    setLeavePrompt(false);
    const saved = await saveCorrection(ownerId, workoutId, {
      send: (input) => workoutsClient.correct(workoutId, input),
      stillOwned: () => !!token && getAuthToken() === token,
      newId: createWorkoutClientId,
      classify: (error) => error instanceof ApiError && error.status === 409 ? 'conflict'
        : error instanceof ApiError && [403, 404].includes(error.status) ? 'inaccessible' : 'unavailable',
    });
    if (saved && getAuthToken() === token) leave();
  };
  const discard = () => { correctionStore.remove(ownerId, workoutId); leave(); };
  const edit = (change: (draft: WorkoutCorrectionDraft) => WorkoutCorrectionDraft) => {
    const current = correctionStore.get(ownerId, workoutId);
    if (current && !current.saving) correctionStore.set(ownerId, workoutId, { ...current, draft: change(current.draft), error: undefined });
  };
  const reloadServer = async () => {
    const confirmed = await confirmAction({ title: t('workouts.correction.reloadTitle'), message: t('workouts.correction.reloadConfirm'),
      confirmLabel: t('workouts.correction.reload'), cancelLabel: t('workouts.correction.keep') });
    if (!confirmed || getAuthToken() !== token) return;
    correctionStore.remove(ownerId, workoutId); setReload((value) => value + 1);
  };
  if (!ownerId) return <StateView kind="error" message={t('workouts.correction.signIn')} />;
  if (!entry) return <View style={styles.screen}><StateView kind={loadError || unsupported ? 'error' : 'loading'}
    message={t(unsupported ? 'workouts.correction.unsupported' : loadError ? 'workouts.detailLoadError' : 'workouts.loadingWorkout')}
    actionLabel={loadError ? t('common.retry') : undefined} onAction={() => setReload((value) => value + 1)} /></View>;
  const { draft, saving } = entry;
  return <>
    <Stack.Screen options={{ title: t('workouts.correction.title') }} />
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text accessibilityRole="header" style={styles.title}>{formatDayHeading(draft.original.startedAt, i18n.language)}</Text>
      <Text style={styles.meta}>{t('workouts.correction.health')}</Text>
      {entry.error ? <Text accessibilityRole="alert" style={styles.error}>{t(`workouts.correction.${entry.error}`)}</Text> : null}
      {entry.error === 'conflict' ? <>
        <Text selectable style={styles.meta}>{t('workouts.correction.copyHint')}</Text>
        <Button label={t('workouts.correction.reload')} variant="secondary" onPress={() => void reloadServer()} />
      </> : null}
      <Text style={styles.label}>{t('workouts.notesLabel')}</Text>
      <TextInput accessibilityLabel={t('workouts.notesLabel')} style={styles.input} multiline value={draft.notes} editable={!saving}
        keyboardAppearance={keyboardAppearance()} onChangeText={(notes) => edit((current) => ({ ...current, notes }))} />
      {draft.exercises.map((exercise) => {
        const original = draft.original.exercises.find((row) => row.id === exercise.id)!;
        return <View key={exercise.id} style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>{original.exerciseName}</Text>
          <TextInput accessibilityLabel={`${original.exerciseName}: ${t('workouts.notesLabel')}`} style={styles.input} multiline value={exercise.notes}
            keyboardAppearance={keyboardAppearance()} editable={!saving} onChangeText={(notes) => edit((current) => ({ ...current,
              exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, notes } : item),
            }))} />
          {exercise.sets.map((set, setIndex) => {
            const saved = original.sets.find((item) => item.id === set.id)!;
            const changeSet = (change: Partial<typeof set>) => edit((current) => ({ ...current, exercises: current.exercises.map((item) => item.id !== exercise.id ? item : {
              ...item, sets: item.sets.map((row) => row.id === set.id ? { ...row, ...change } : row),
            }) }));
            return <View key={set.id} style={styles.set}>
              <Text style={styles.label}>{t('workouts.correction.set', { number: setIndex + 1 })}</Text>
              <View style={styles.row}>
                <Text style={styles.label}>{t('workouts.correction.performed')}</Text>
                <Switch accessibilityLabel={`${original.exerciseName}, ${t('workouts.correction.set', { number: setIndex + 1 })}, ${t('workouts.correction.performed')}`}
                  value={set.performed} disabled={saving} onValueChange={(performed) => changeSet({ performed })} />
              </View>
              <View style={styles.fields}>
                {correctionFields(saved, original.sets).map((field) => <View key={field} style={styles.field}>
                  <Text style={styles.label}>{t(`workouts.correction.fields.${field}`)}{field === 'weightKg' ? ` (${draft.unit})` : ''}</Text>
                  <TextInput accessibilityLabel={`${original.exerciseName}, ${setIndex + 1}, ${t(`workouts.correction.fields.${field}`)}${field === 'weightKg' ? ` ${draft.unit}` : ''}`}
                    style={styles.input} keyboardAppearance={keyboardAppearance()} keyboardType="decimal-pad" editable={!saving}
                    value={set.values[field]} onChangeText={(value) => changeSet({ values: { ...set.values, [field]: value } })} />
                </View>)}
              </View>
              <View style={styles.fields}>{(['normal', 'warmup', 'drop', 'failure'] as const).map((type) => <Chip key={type}
                label={t(`workouts.setType.${type}`)} selected={set.type === type} onPress={saving ? undefined : () => changeSet({ type })} />)}</View>
            </View>;
          })}
        </View>;
      })}
      <Button label={t(saving ? 'workouts.correction.saving' : 'common.save')} disabled={saving || !correctionIsDirty(draft)} fullWidth onPress={() => void save()} />
      <Button label={t('common.cancel')} variant="secondary" disabled={saving} fullWidth onPress={() => router.back()} />
    </ScrollView>
    <Modal visible={leavePrompt} transparent onRequestClose={() => setLeavePrompt(false)}>
      <View style={styles.backdrop}><View style={styles.card} accessibilityViewIsModal>
        <Text style={styles.heading}>{t('workouts.correction.leaveTitle')}</Text>
        <Button label={t('common.save')} disabled={saving} onPress={() => void save()} fullWidth />
        <Button label={t('workouts.correction.discard')} variant="secondary" onPress={discard} fullWidth />
        <Button label={t('workouts.correction.keep')} variant="ghost" onPress={() => { repeat.current = null; setLeavePrompt(false); }} fullWidth />
      </View></View>
    </Modal>
  </>;
}
const styles = createStyles(() => ({
  screen: { ...commonStyles.screen }, container: { ...commonStyles.scrollContent },
  title: { ...commonStyles.title }, heading: { ...typeScale.heading, color: colors.text },
  card: { ...commonStyles.card, gap: spacing.sm }, set: { gap: spacing.xs, marginBottom: spacing.md },
  input: { ...commonStyles.input, minHeight: 44 }, label: { ...typeScale.caption, color: colors.text },
  meta: { ...commonStyles.meta }, error: { ...commonStyles.error },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, field: { flexGrow: 1, flexBasis: 120 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.overlay },
}));
