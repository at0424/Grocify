import { signUp } from "aws-amplify/auth";
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

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    // Basic Validation
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Call Amplify SignUp
      const { isSignUpComplete, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email: email, 
          },
        },
      });

      // If SUCCESS, continue with confirm sign up
      if (nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        router.push({
          pathname: './confirmation', 
          params: { email },
        });
      } else if (isSignUpComplete) {
        router.replace('/(tabs)');
      }

    } catch (err: any) {
      Alert.alert("Sign Up Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TextInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity 
        onPress={handleSignUp} 
        style={[styles.button, loading && { opacity: 0.7 }]}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating Account..." : "Create Account"}
        </Text>
      </TouchableOpacity>

      <View style={styles.signinContainer}>
        <Text style={styles.signinText}>Already have an account? </Text>
        <TouchableOpacity onPress={handleSignIn}>
          <Text style={styles.linkText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },

  input: {
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  button: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
  },

  signinContainer: {
    flexDirection: "row",
    marginTop: 16,
  },

  signinText: {
    color: "#444",
  },

  linkText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
});
