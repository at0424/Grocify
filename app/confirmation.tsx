import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
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

export default function ConfirmationScreen() {
  const router = useRouter();
  
  // Get the email passed from the Sign Up screen
  const params = useLocalSearchParams();
  const email = params.email as string; 

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Function to submit the code
  const handleConfirm = async () => {
    if (!code) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }
    setLoading(true);

    try {
      // Call Amplify Confirm
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code
      });

      if (isSignUpComplete) {
        Alert.alert("Success", "Your account is verified! Please log in.");
        // Redirect back to Sign In
        router.dismissAll(); // Clears the stack
        router.replace("./"); 
      }
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to resend the code if they didn't get it
  const handleResend = async () => {
    try {
      await resendSignUpCode({ username: email });
      Alert.alert("Sent", "A new code has been sent to your email.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Email</Text>
      
      <Text style={styles.subtitle}>
        Enter the code sent to:{"\n"}
        <Text style={styles.emailText}>{email}</Text>
      </Text>

      <TextInput
        placeholder="123456"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad" 
        maxLength={6}
        style={styles.input}
      />

      <TouchableOpacity 
        onPress={handleConfirm} 
        style={[styles.button, loading && { opacity: 0.7 }]}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Verifying..." : "Confirm Code"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend} style={styles.resendContainer}>
        <Text style={styles.linkText}>Resend Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  emailText: {
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 18,
    textAlign: "center", 
    letterSpacing: 5,    
  },
  button: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  resendContainer: {
    marginTop: 20,
  },
  linkText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
});