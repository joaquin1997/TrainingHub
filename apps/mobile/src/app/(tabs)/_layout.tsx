import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar } from 'expo-router/tabs';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

import { WorkoutBar } from '@/features/workouts/components/WorkoutBar';
import { colors, fonts, typeScale } from '@/ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focused: IconName, unfocused: IconName) {
  // The tab bar passes back the tint colours set below, which are strings.
  return ({ color, size, focused: isFocused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={isFocused ? focused : unfocused} size={size} color={color as string} />
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      // The workout bar sits just above the tabs, in the layout flow, so every
      // tab screen shrinks to make room for it (spec 0019).
      tabBar={(props) => (
        <>
          <WorkoutBar />
          <BottomTabBar {...props} />
        </>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        // Caption size without its line height: the bar sizes the label itself.
        tabBarLabelStyle: { fontSize: typeScale.caption.fontSize, fontFamily: fonts.display },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="routines"
        options={{
          title: t('nav.routines'),
          tabBarIcon: tabIcon('clipboard', 'clipboard-outline'),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: t('nav.exercises'),
          tabBarIcon: tabIcon('barbell', 'barbell-outline'),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('nav.progress'),
          tabBarIcon: tabIcon('trending-up', 'trending-up-outline'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('nav.history'),
          tabBarIcon: tabIcon('time', 'time-outline'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav.settings'),
          tabBarIcon: tabIcon('options', 'options-outline'),
        }}
      />
    </Tabs>
  );
}
