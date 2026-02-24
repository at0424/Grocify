import * as SplashScreen from 'expo-splash-screen';
import 'react-native-get-random-values';
import "../services/amplifySetup";

import { useFonts } from 'expo-font';
import { Stack } from "expo-router";
import { useEffect } from 'react';
import { AuthProvider } from "../amplify/auth/authContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'PixelFont': require('@/assets/fonts/PressStart2P-Regular.ttf'), 
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </AuthProvider>
  );
}
