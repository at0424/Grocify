import { resetPassword } from 'aws-amplify/auth';
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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { width } = useWindowDimensions();
  const isTablet = width >= 710;

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
          router.replace("/sign_in");
      }

    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Background Image */}
      <Image 
        source={require('@/assets/images/forgot_pw/BricksBG.png')} 
        style={styles.backgroundImage}
        resizeMode="repeat"
      />

      {/* Top left close button */}
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
          {/* Magnifier */}
            <Image
              source={require('@/assets/images/forgot_pw/Magnifier.png')}
              style={[styles.magnifier, isTablet && styles.magnifierTablet]}
              resizeMode="contain"
            />
            
          <View style={[styles.formContainer, isTablet && styles.formContainerTablet]}>
            {/* Content */}
            <Text style={[styles.title, isTablet && styles.titleTablet]}>Forgot Password?</Text>

            <Text style={[styles.description, isTablet && styles.descriptionTablet]}>
              Please enter your email to receive a confirmation code to set a new password.
            </Text>

            {/* Email Input Group */}
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

            {/* Continue Button */}
            <TouchableOpacity
              onPress={handleSendCode}
              style={[styles.button, isTablet && styles.buttonTablet, loading && { opacity: 0.7 }]}
              disabled={loading}
            >
              <Text style={[styles.buttonText, isTablet && styles.buttonTextTablet]}>
                {loading ? "Sending..." : "Continue"}
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bags */}
      <View style={styles.bagsContainer} pointerEvents="none">
        <Image 
          source={require('@/assets/images/forgot_pw/BagLeft.png')} 
          style={[styles.bagLeft, isTablet && styles.bagLeftTablet]}
          resizeMode="contain"
        />
        <Image 
          source={require('@/assets/images/forgot_pw/BagRight.png')} 
          style={[styles.bagRight, isTablet && styles.bagRightTablet]}
          resizeMode="contain"
        />
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: -1, 
  },
  keyboardAvoid: { 
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center", 
    alignItems: "center",
    paddingBottom: '35%', 
  },
  
  closeButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 50 : 30, 
    left: 20,
    zIndex: 20,
    padding: 10,
  },
  closeText: {
    fontSize: 24,
    color: '#FFF',
    fontFamily: 'PixelFont',
  },

  formContainer: {
    width: "100%",
    maxWidth: 340, 
    alignItems: "center",
    zIndex: 10,
  },
  formContainerTablet: {
    maxWidth: 580,
  },

  // --- Magnifier ---
  magnifier: {
    height: '20%',  
    aspectRatio: 1,   
    marginBottom: 20, 
  },
  magnifierTablet: {
    height: '25%',
    aspectRatio: 1,
    marginBottom: 30,
  },
  
  // --- Typography ---
  title: {
    fontSize: 24,
    color: "#FFF",
    marginBottom: 16,
    textAlign: "center",
    fontFamily: 'PixelFont', 
    textTransform: 'uppercase', 
    textShadowColor: '#1A1D24', 
    textShadowOffset: { width: 2, height: 2 }, 
    textShadowRadius: 0, 
  },
  description: {
    fontSize: 12,
    color: "#D0D4DF", 
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 10,
    fontFamily: 'PixelFont',
    lineHeight: 20, 
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
    borderColor: '#282e25db',
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
    paddingVertical: 0,
    includeFontPadding: false, 
    textAlignVertical: 'center',
  },

  // --- Bags Styles ---
  bagsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    zIndex: 1, 
  },
  bagLeft: {
    width: '50%',
    aspectRatio: 1,
  },
  bagRight: {
    width: '50%',
    aspectRatio: 1,
  },
  bagLeftTablet: {
    width: '40%',
  },
  bagRightTablet: {
    width: '40%',
  },

  // --- Tablet Styles ---
  titleTablet: {
    fontSize: 32,
    marginBottom: 20,
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
    fontSize: 15,
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
});