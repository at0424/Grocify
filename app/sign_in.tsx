import SceneBackground from '@/components/SceneBackground';
import { signIn } from 'aws-amplify/auth';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
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

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const logoScaleAnim = useRef(new Animated.Value(0.96)).current;

  const { width } = useWindowDimensions();
  const isTablet = width >= 710;

  const handleSignIn = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
        options: { authFlowType: "USER_PASSWORD_AUTH" }
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

  // --- Logo Animation ---
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        // Enlarge
        Animated.timing(logoScaleAnim, {
          toValue: 1.08, 
          duration: 1500, 
          easing: Easing.inOut(Easing.ease), 
          useNativeDriver: true, 
        }),
        // Shrink
        Animated.timing(logoScaleAnim, {
          toValue: 0.96, 
          duration: 1500, 
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const animatedLogoStyle = {
    transform: [{ scale: logoScaleAnim }],
  };

  return (
    <View style={styles.root}>
      {/* Background */}
      <SceneBackground />

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
            {/* Logo Area */}
            <View style={styles.headerContainer}>
              <Animated.Image
                source={require('@/assets/images/Grocify_Logo.png')}
                style={[
                  styles.logoImage,
                  animatedLogoStyle,
                  isTablet && styles.logoImageTablet
                ]}
                resizeMode="contain"
              />
            </View>

            {/* Form Area */}
            <View style={[styles.formContainer, isTablet && styles.formContainerTablet]}>

              <Text style={[styles.title, isTablet && styles.titleTablet]}>Sign in</Text>

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

              {/* Forgot Password */}
              <TouchableOpacity onPress={() => router.push("/forgot_pw")} style={styles.forgotPassword}>
                <Text style={[styles.forgotText, isTablet && styles.forgotTextTablet]}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity onPress={handleSignIn} style={[styles.button, isTablet && styles.buttonTablet]}>
                <Text style={[styles.buttonText, isTablet && styles.buttonTextTablet]}>{loading ? "Signing In..." : "Login"}</Text>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signupContainer}>
                <Text style={[styles.signupText, isTablet && styles.signupTextTablet]}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.replace("/sign_up")}>
                  <Text style={[styles.linkText, isTablet && styles.linkTextTablet]}>Sign up</Text>
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

  // --- Stall Styles ---
  leftStall: {
    position: 'absolute',
    left: '-15%',
    top: '25%',
    width: '52%',
    aspectRatio: 0.9,
    zIndex: 3,
  },
  rightStall: {
    position: 'absolute',
    right: '-15%',
    top: '35%',
    width: '50%',
    aspectRatio: 0.9,
    zIndex: 3,
  },
  leftStallTablet: {
    position: 'absolute',
    right: '-10%',
    top: '35%',
    height: '35%',
    aspectRatio: 0.9,
    zIndex: 3,
  },
  rightStallTablet: {
    position: 'absolute',
    right: '-10%',
    top: '35%',
    height: '35%',
    aspectRatio: 0.9,
    zIndex: 3,
  },
  // --- Trees Styles ---
  singleTreeLeft: {
    position: 'absolute',
    left: '-20%',
    top: '10%',
    width: '65%',
    aspectRatio: 0.60,
    zIndex: 2,
  },
  singleTreeRight: {
    position: 'absolute',
    right: '-20%',
    top: '10%',
    width: '65%',
    aspectRatio: 0.60,
    zIndex: 2,
  },
  singleTreeLeftTablet: {
    position: 'absolute',
    left: '-20%',
    top: '-5%',
    height: '85%',
    aspectRatio: 0.60,
    zIndex: 2,
  },
  singleTreeRightTablet: {
    position: 'absolute',
    right: '-20%',
    top: '-5%',
    height: '85%',
    aspectRatio: 0.60,
    zIndex: 2,
  },

  // --- Grocify Logo ---
  headerContainer: {
    alignItems: "center",
    justifyContent: "center",
    maxHeight: '30%',
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
  },
  logoImage: {
    width: '70%',
    maxWidth: 280,
    aspectRatio: 1.1,
  },
  logoImageTablet: {
    width: '50%',
    maxWidth: 380,
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
    textShadowRadius: 1,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    color: '#FFF',
    fontSize: 14,
    marginBottom: 5,
    marginLeft: 2,
    fontFamily: 'PixelFont',
    textTransform: 'uppercase',
    textShadowColor: '#1A2F10', 
    textShadowOffset: { width: 2, height: 2 }, 
    textShadowRadius: 1,
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
    color: "#2D1B00",
    fontFamily: 'PixelFont',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  forgotPassword: {
    width: "100%",
    alignItems: "flex-end",
    marginBottom: 30,
  },
  forgotText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: 'PixelFont',
    textShadowColor: '#1A2F10', 
    textShadowOffset: { width: 2, height: 2 }, 
    textShadowRadius: 1,
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
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontFamily: 'PixelFont',
    textTransform: 'uppercase',
    paddingVertical: 0,
    includeFontPadding: false,
    textShadowColor: '#3D200E',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  // --- Sign Up Link Styles ---
  signupContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  signupText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: 'PixelFont',
    textShadowColor: '#1A2F10', 
    textShadowOffset: { width: 2, height: 2 }, 
    textShadowRadius: 1,
  },
  linkText: {
    color: "#eee015ff",
    fontSize: 12,
    fontFamily: 'PixelFont',
    textTransform: 'uppercase',
    textShadowColor: '#1A2F10', 
    textShadowOffset: { width: 2, height: 2 }, 
    textShadowRadius: 1,
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
    fontSize: 15,
  },
  forgotTextTablet: {
    fontSize: 16,
    marginBottom: 40,
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
  signupTextTablet: {
    fontSize: 16,
  },
  linkTextTablet: {
    fontSize: 16,
  },
});