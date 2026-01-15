import { resetPassword } from 'aws-amplify/auth';
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      // Call AWS to send the code
      const output = await resetPassword({ username: email });
      
      const { nextStep } = output;

      if (nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
        router.push({
            pathname: "./reset_pw", 
            params: { email }
        });
      } else if (nextStep.resetPasswordStep === 'DONE') {
          Alert.alert("Success", "Password reset complete.");
          router.back();
      }

    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top left close button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.closeButton}
      >
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>

      {/* Content */}
      <Text style={styles.title}>Forgot Password</Text>

      <Text style={styles.description}>
        Please enter your email to receive a confirmation code to set a new
        password.
      </Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TouchableOpacity
        onPress={handleSendCode}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Send Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },

  closeButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
  },

  closeText: {
    fontSize: 28,
    fontWeight: "600",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },

  description: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 10,
  },

  input: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },

  button: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
