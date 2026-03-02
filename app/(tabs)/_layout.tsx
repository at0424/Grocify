import { Stack } from "expo-router";

export default function TabsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' }
      }}
    >
      {/* Main Dashboard */}
      <Stack.Screen name="index" options={{ headerShown: false }}/>

      {/* Listing  */}
      <Stack.Screen 
        name="(listing)" 
        options={{ 
          headerShown: false,
          presentation: 'transparentModal', 
          animation: 'fade', 
          contentStyle: { backgroundColor: 'transparent' }
        }} 
      />
  
    </Stack>
  );
}
