import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import {
  restAlertsForThisDevice,
  type RestAlertPermission,
} from '@/features/workouts/restTimer/restAlerts';
import { ListRow } from '@/ui/ListRow';

/**
 * "Rest alerts" in Settings (spec 0037 FR-14), where the device can alert
 * outside the app: on, off or not yet asked. Not asked → tapping brings up
 * the system prompt; off → it leads to the system settings, the only place
 * to turn them back on. Hidden where the build cannot tell.
 */
export function RestAlertsRow() {
  const { t } = useTranslation();
  const alerts = useMemo(() => restAlertsForThisDevice(), []);
  const [status, setStatus] = useState<RestAlertPermission>('unknown');

  const refresh = useCallback(() => {
    void alerts.permissionStatus().then(setStatus).catch(() => setStatus('unknown'));
  }, [alerts]);

  // Again on coming back from the system settings.
  useFocusEffect(
    useCallback(() => {
      refresh();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          refresh();
        }
      });
      return () => subscription.remove();
    }, [refresh]),
  );

  if (!alerts.outsideApp || status === 'unknown') {
    return null;
  }

  const onPress = async () => {
    if (status === 'notAsked') {
      await alerts.requestPermission();
      refresh();
    } else if (status === 'denied') {
      await alerts.openSystemSettings();
    }
  };

  return (
    <ListRow
      leading="notifications-outline"
      title={t('settings.restAlerts')}
      subtitle={
        status === 'granted'
          ? t('settings.restAlertsOn')
          : status === 'denied'
            ? t('settings.restAlertsOff')
            : t('settings.restAlertsNotAsked')
      }
      subtitleLines={2}
      onPress={status === 'granted' ? undefined : () => void onPress()}
      chevron={status !== 'granted'}
    />
  );
}
