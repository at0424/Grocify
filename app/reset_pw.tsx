import { confirmResetPassword } from "aws-amplify/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams(); // Get email from previous screen

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!code || !newPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);

    try {
      // confirmResetPassword takes an object
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword,
      });

      Alert.alert("Success", "Your password has been changed.");
      
      // Navigate back to Login
      router.dismissAll();
      router.replace("./"); 
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.description}>Enter the code sent to {email}</Text>

      <TextInput
        placeholder="Code (e.g. 123456)"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        style={styles.input}
      />

      <TextInput
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity 
        onPress={handleReset} 
        style={[styles.button, loading && { opacity: 0.7 }]}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
            {loading ? "Updating..." : "Set New Password"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  description: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 20 },
  input: {
    width: "100%", maxWidth: 320, alignSelf: "center", borderWidth: 1,
    borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12,
  },
  button: {
    width: "100%", maxWidth: 320, alignSelf: "center", backgroundColor: "#4F46E5",
    padding: 14, borderRadius: 8, alignItems: "center", marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "bold" },
});