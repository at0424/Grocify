import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const user = await getCurrentUser();
      
      if (user) {
        // User is logged in -> Go to Tabs
        router.replace("/(tabs)"); 
      } else {
        // User is not logged in -> Go to Sign In
        router.replace("/sign_in");
      }
    } catch (err) {
      // If any error occurs, safe default is Sign In
      router.replace("/sign_in");
    }
  }

  // Show a loading circle while we decide
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
}