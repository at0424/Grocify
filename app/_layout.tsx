import 'react-native-get-random-values';
import "../awsConfig";

import { Stack } from "expo-router";
import { AuthProvider } from "../auth/authContext";

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
