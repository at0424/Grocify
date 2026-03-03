import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";

export default function ListingLayout() {
  const [fontsLoaded] = useFonts({
    'PixelFont': require('@/assets/fonts/PressStart2P-Regular.ttf'), 
  });

  useEffect(() => {
      if (fontsLoaded) {
        SplashScreen.hideAsync();
      }
    }, [fontsLoaded]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'transparentModal', 
        contentStyle: { backgroundColor: 'transparent' }, 
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
