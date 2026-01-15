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
      // Usually the username is the email, or you can fetch attributes
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
      <View style={styles.card}>
        <View style={styles.avatarPlaceholder} />
        <Text style={styles.emailText}>{userEmail}</Text>
        <Text style={styles.roleText}>App User</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    width: '85%',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    marginBottom: 15,
  },
  emailText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  roleText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
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