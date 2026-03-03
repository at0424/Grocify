import SceneBackground from "@/components/SceneBackground";
import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  useWindowDimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ConfirmationScreen() {
  const router = useRouter();
  
  // Get the email passed from the Sign Up screen
  const params = useLocalSearchParams();
  const email = params.email as string; 

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const { width } = useWindowDimensions();
  const isTablet = width >= 710;

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
        router.replace("/"); // Navigates back to the root Sign In screen
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
    <View style={styles.root}>
      {/* Pixel Background */}
      <SceneBackground />
      
      {/* Layout Wrappers */}
      <SafeAreaView style={styles.safeArea}>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>

        <KeyboardAvoidingView 
          style={styles.keyboardAvoid} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={[styles.formContainer, isTablet && styles.formContainerTablet]}>
              
              <Text style={[styles.title, isTablet && styles.titleTablet]}>Verify Email</Text>
              
              <Text style={[styles.description, isTablet && styles.descriptionTablet]}>
                Enter the code sent to{"\n"}
                <Text style={styles.emailText}>{email || "your email"}</Text>
              </Text>

              {/* Code Input Group */}
              <View style={[styles.inputWrapper, isTablet && styles.inputWrapperTablet]}>
                <Image
                  source={require('@/assets/images/sign_in/Padlock.png')}
                  style={[styles.icon, isTablet && styles.iconTablet]}
                  resizeMode="contain"
                />
                <Text style={[styles.divider, isTablet && styles.dividerTablet]}>|</Text>
                <TextInput
                  placeholder="123456"
                  placeholderTextColor="#8C7A6B"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, isTablet && styles.inputTablet]}
                />
              </View>

              {/* Confirm Button */}
              <TouchableOpacity 
                onPress={handleConfirm} 
                style={[styles.button, isTablet && styles.buttonTablet, loading && { opacity: 0.7 }]}
                disabled={loading}
              >
                <Text style={[styles.buttonText, isTablet && styles.buttonTextTablet]}>
                  {loading ? "Verifying..." : "Confirm Code"}
                </Text>
              </TouchableOpacity>

              {/* Resend Link */}
              <View style={styles.resendContainer}>
                <Text style={[styles.resendText, isTablet && styles.resendTextTablet]}>Didn't receive a code? </Text>
                <TouchableOpacity onPress={handleResend}>
                  <Text style={[styles.linkText, isTablet && styles.linkTextTablet]}>Resend</Text>
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
  
  closeButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 50 : 30, 
    left: 20,
    zIndex: 20,
    padding: 10,
  },
  closeText: {
    fontSize: 24,
    color: 'black',
    fontFamily: 'PixelFont',
  },

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

  // --- Typography ---
  title: {
    fontSize: 28,
    color: "#FFF",
    marginBottom: 16,
    textAlign: "center",
    fontFamily: 'PixelFont', 
    textTransform: 'uppercase', 
    textShadowColor: '#3a5a2b', 
    textShadowOffset: { width: 2, height: 2 }, 
    textShadowRadius: 0, 
  },
  description: {
    fontSize: 12,
    color: "#FFF", 
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 10,
    fontFamily: 'PixelFont',
    lineHeight: 20, 
  },
  emailText: {
    color: '#eee015ff', 
  },

  // --- Retro Inputs ---
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
    marginBottom: 20,
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
    letterSpacing: 5,
  },

  // --- Retro Button ---
  button: {
    width: "100%",
    backgroundColor: "#9A6B48", 
    paddingTop: 16,       
    paddingBottom: 12,    
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3D200E',
    borderBottomWidth: 6, 
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontFamily: 'PixelFont',
    textTransform: 'uppercase',
    textShadowColor: '#3D200E', 
    textShadowOffset: { width: 1, height: 1 }, 
    textShadowRadius: 0,
    includeFontPadding: false, 
    textAlignVertical: 'center',
  },

  // --- Footer Links ---
  resendContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  resendText: {
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

  // --- Tablet Styles ---
  titleTablet: {
    fontSize: 42,
    marginBottom: 20,
    textShadowOffset: { width: 3, height: 3 }, 
  },
  descriptionTablet: {
    fontSize: 16,
    lineHeight: 28,
    marginBottom: 40,
  },
  inputWrapperTablet: {
    height: 70, 
    marginBottom: 30,
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
    fontSize: 18, 
    letterSpacing: 8,
  },
  buttonTablet: {
    paddingTop: 22,
    paddingBottom: 18,
    borderRadius: 10,
    borderWidth: 3,
    borderBottomWidth: 8,
  },
  buttonTextTablet: {
    fontSize: 22,
    textShadowOffset: { width: 2, height: 2 },
  },
  resendTextTablet: {
    fontSize: 16,
  },
  linkTextTablet: {
    fontSize: 16,
  },
});