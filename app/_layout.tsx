import 'react-native-get-random-values';
import "../services/amplifySetup";

import { Stack } from "expo-router";
import { AuthProvider } from "../amplify/auth/authContext";

export default function RootLayout() {
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
