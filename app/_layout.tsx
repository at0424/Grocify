import * as SplashScreen from 'expo-splash-screen';
import 'react-native-get-random-values';
import "../services/amplifySetup";

import { Audio } from 'expo-av';
import { useFonts } from 'expo-font';
import { Stack } from "expo-router";
import { useEffect, useRef } from 'react';
import { AuthProvider } from "../amplify/auth/authContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'PixelFont': require('@/assets/fonts/PressStart2P-Regular.ttf'), 
  });
  
  const soundRef = useRef(new Audio.Sound());

  // --- Splash Screen and Font Logic ---
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // --- Global Background Music Logic ---
  useEffect(() => {
    async function playGlobalMusic() {
      try {
        await soundRef.current.loadAsync(
          require('@/assets/audio/bgm.mp3') 
        );
        // Set it to loop and adjust the volume
        await soundRef.current.setIsLoopingAsync(true);
        await soundRef.current.setVolumeAsync(0.3); 
        // Play it!
        await soundRef.current.playAsync();
      } catch (err) {
        console.log("Error playing background music: ", err);
      }
    }

    playGlobalMusic();

    // Clean up the audio when the app is completely closed
    return () => {
      soundRef.current.unloadAsync();
    };
  }, []);

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
