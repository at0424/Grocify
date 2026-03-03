import SceneBackground from "@/components/SceneBackground";
import { signUp } from "aws-amplify/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { width } = useWindowDimensions();
  const isTablet = width >= 710;

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
    router.replace("/sign_in");
  };

  return (
    <View style={styles.root}>
      {/* Shared Pixel Background */}
      <SceneBackground />

      {/* Layout Wrappers for scrolling & keyboard */}
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Form Area */}
            <View style={[styles.formContainer, isTablet && styles.formContainerTablet]}>

              <Text style={[styles.title, isTablet && styles.titleTablet]}>Sign Up</Text>

              {/* Email Input Group */}
              <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>Email</Text>
              <View style={[styles.inputWrapper, isTablet && styles.inputWrapperTablet]}>
                <Image
                  source={require('@/assets/images/sign_in/Email.png')}
                  style={[styles.icon, isTablet && styles.iconTablet]}
                  resizeMode="contain"
                />
                <Text style={[styles.divider, isTablet && styles.dividerTablet]}>|</Text>
                <TextInput
                  placeholder="example@gmail.com"
                  placeholderTextColor="#8C7A6B"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, isTablet && styles.inputTablet]}
                />
              </View>

              {/* Password Input Group */}
              <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>Password</Text>
              <View style={[styles.inputWrapper, isTablet && styles.inputWrapperTablet]}>
                <Image
                  source={require('@/assets/images/sign_in/Padlock.png')}
                  style={[styles.icon, isTablet && styles.iconTablet]}
                  resizeMode="contain"
                />
                <Text style={[styles.divider, isTablet && styles.dividerTablet]}>|</Text>
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#8C7A6B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={[styles.input, isTablet && styles.inputTablet]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Image
                    source={showPassword
                      ? require('@/assets/images/sign_in/EyeOpen.png')
                      : require('@/assets/images/sign_in/EyeClosed.png')
                    }
                    style={[styles.icon, isTablet && styles.iconTablet]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input Group */}
              <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>Confirm Password</Text>
              <View style={[styles.inputWrapper, isTablet && styles.inputWrapperTablet]}>
                <Image
                  source={require('@/assets/images/sign_in/Padlock.png')}
                  style={[styles.icon, isTablet && styles.iconTablet]}
                  resizeMode="contain"
                />
                <Text style={[styles.divider, isTablet && styles.dividerTablet]}>|</Text>
                <TextInput
                  placeholder="Confirm your password"
                  placeholderTextColor="#8C7A6B"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  style={[styles.input, isTablet && styles.inputTablet]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Image
                    source={showPassword
                      ? require('@/assets/images/sign_in/EyeOpen.png')
                      : require('@/assets/images/sign_in/EyeClosed.png')
                    }
                    style={[styles.icon, isTablet && styles.iconTablet]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                onPress={handleSignUp}
                style={[styles.button, isTablet && styles.buttonTablet, loading && { opacity: 0.7 }]}
                disabled={loading}
              >
                <Text style={[styles.buttonText, isTablet && styles.buttonTextTablet]}>
                  {loading ? "Creating..." : "Sign Up"}
                </Text>
              </TouchableOpacity>

              {/* Footer Link */}
              <View style={styles.signinContainer}>
                <Text style={[styles.signinText, isTablet && styles.signinTextTablet]}>Already have an account? </Text>
                <TouchableOpacity onPress={handleSignIn}>
                  <Text style={[styles.linkText, isTablet && styles.linkTextTablet]}>Sign In</Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#6B9E49',
  },
  safeArea: {
    flex: 1,
    zIndex: 10,
    elevation: 10,
  },
  keyboardAvoid: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 20,
  },

  formContainer: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    zIndex: 10,
  },
  formContainerTablet: {
    maxWidth: 480,
  },

  // --- Wording Styles (Mobile) ---
  title: {
    fontSize: 28,
    color: "#FFF",
    alignSelf: 'flex-start',
    marginBottom: 20,
    fontFamily: 'PixelFont',
    textTransform: 'uppercase',
    textShadowColor: '#3a5a2b',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    color: '#FFF',
    fontSize: 14,
    marginBottom: 5,
    marginLeft: 2,
    fontFamily: 'PixelFont',
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4EBD9',
    width: '100%',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3a5a2b',
    borderBottomWidth: 5,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 50,
  },
  icon: {
    width: 20,
    height: 20,
  },
  divider: {
    color: '#8C7A6B',
    marginHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 12,
    color: "#2D1B00",
    fontFamily: 'PixelFont',
    paddingVertical: 0,
    includeFontPadding: false,
  },

  // --- RETRO BUTTON STYLES ---
  button: {
    width: "100%",
    backgroundColor: "#9A6B48",
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3D200E',
    borderBottomWidth: 6,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontFamily: 'PixelFont',
    textTransform: 'uppercase',
    textShadowColor: '#3D200E',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  signinContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  signinText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: 'PixelFont',
  },
  linkText: {
    color: "#eee015ff",
    fontSize: 12,
    fontFamily: 'PixelFont',
    textTransform: 'uppercase',
  },
  eyeButton: {
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- Wording Styles (Tablet) ---
  titleTablet: {
    fontSize: 42,
    marginBottom: 30,
    textShadowOffset: { width: 3, height: 3 },
  },
  inputLabelTablet: {
    fontSize: 18,
    marginBottom: 8,
  },
  inputWrapperTablet: {
    height: 70,
    marginBottom: 24,
    borderWidth: 3,
    borderBottomWidth: 7,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  iconTablet: {
    width: 28,
    height: 28,
  },
  dividerTablet: {
    fontSize: 20,
    marginHorizontal: 12,
  },
  inputTablet: {
    fontSize: 14,
  },
  buttonTablet: {
    padding: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderBottomWidth: 8,
  },
  buttonTextTablet: {
    fontSize: 22,
    textShadowOffset: { width: 2, height: 2 },
  },
  signinTextTablet: {
    fontSize: 16,
  },
  linkTextTablet: {
    fontSize: 16,
  },
});