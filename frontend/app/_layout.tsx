import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { THEME } from '../constants/theme';
import { MumeLogo } from '../components/MumeLogo';

// Prevent the native splash screen from auto-hiding until the app is ready
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Reload/dev mode safeguard */
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: THEME.colors.bg,
          },
          headerTintColor: THEME.colors.text,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: THEME.colors.bg,
            maxWidth: 480,
            width: '100%',
            alignSelf: 'center',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="link-page"
          options={{
            title: 'Link Facebook Page',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
