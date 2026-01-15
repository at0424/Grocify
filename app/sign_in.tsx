import { signIn } from 'aws-amplify/auth';
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
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading) return; 
    setLoading(true);

    try {
      const { isSignedIn, nextStep } = await signIn({ 
        username: email, 
        password,
        options: {
          authFlowType: "USER_PASSWORD_AUTH"
        }
      });
      
      if (isSignedIn) {
        router.replace("/(tabs)"); 
      } else {
        if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
          Alert.alert("Login Issue", "Could not complete sign-in.");        
        }
      }
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Sign In</Text>

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

          <TouchableOpacity onPress={() => router.push("/forgot_pw")} style={styles.forgotPassword}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSignIn} style={styles.button}>
            <Text style={styles.buttonText}>{loading ? "Signing In..." : "Sign In"}</Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don’t have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/sign_up")}>
              <Text style={styles.linkText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
  input: { width: "100%", maxWidth: 320, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12 },
  forgotPassword: { width: "100%", maxWidth: 320, alignItems: "flex-end", marginBottom: 16 },
  button: { width: "100%", maxWidth: 320, backgroundColor: "#4F46E5", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "bold" },
  signupContainer: { flexDirection: "row", marginTop: 16 },
  signupText: { color: "#444" },
  linkText: { color: "#4F46E5", fontWeight: "600" },
});