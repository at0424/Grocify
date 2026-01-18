import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("Loading...");

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const user = await getCurrentUser();
      setUserEmail(user.username || "User"); 
    } catch (err) {
      setUserEmail("Guest");
    }
  }

  async function handleSignOut() {
    try {
      await signOut(); 
      router.replace("/sign_in");
    } catch (err) {
      Alert.alert("Error", "Failed to sign out.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome Back!</Text>
      <Text style={styles.subHeader}>Select a dashboard to continue</Text>

      <View style={styles.buttonContainer}>
        
        {/* Listing Dashboard */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('./(listing)')}
        >
          <Text style={styles.buttonText}>Listing Dashboard</Text>
        </TouchableOpacity>

        {/* Item Freshness Dashboard */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('./(freshness)')}
        >
          <Text style={styles.buttonText}>Item Freshness</Text>
        </TouchableOpacity>

        {/* Meal Plan Dashboard */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('./(meal_plan)')}
        >
          <Text style={styles.buttonText}>Meal Plans</Text>
        </TouchableOpacity>

        {/* AI Chatbot Dashboard */}
        <TouchableOpacity 
          style={[styles.button, styles.aiButton]} 
          onPress={() => router.push('./(ai)')}
        >
          <Text style={styles.buttonText}>AI Assistant</Text>
        </TouchableOpacity>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subHeader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 15, 
  },
  button: {
    width: '80%',
    paddingVertical: 15,
    backgroundColor: '#007AFF', 
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15, 
  },
  aiButton: {
    backgroundColor: '#5856D6', 
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    width: '85%',
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});