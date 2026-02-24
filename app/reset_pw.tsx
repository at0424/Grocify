import { confirmResetPassword } from "aws-amplify/auth";
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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams(); // Get email from previous screen

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { width } = useWindowDimensions();
  const isTablet = width >= 710;

  const handleReset = async () => {
    if (!code || !newPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);

    try {
      await confirmResetPassword({
        username: email as string,
        confirmationCode: code,
        newPassword: newPassword,
      });

      Alert.alert("Success", "Your password has been changed.");
      
      // Navigate back to Login
      router.dismissAll();
      router.replace("/"); 
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Shared Brick Background */}
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
          contentContainerStyle={[styles.scrollContent, isTablet && { paddingTop: 380}]} 
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Hanging Padlock */}
            <Image
              source={require('@/assets/images/forgot_pw/Chains.png')}
              style={[styles.padlocksImage, isTablet && styles.padlocksImageTablet]}
              resizeMode="contain"
            />

          <View style={[styles.formContainer, isTablet && styles.formContainerTablet]}>

            {/* Content */}
            <Text style={[styles.title, isTablet && styles.titleTablet]}>New Password</Text>

            <Text style={[styles.description, isTablet && styles.descriptionTablet]}>
              Enter the 6-digit code sent to{"\n"}
              <Text style={styles.emailText}>{email || "your email"}</Text>
            </Text>

            {/* Code Input Group */}
            <View style={[styles.inputWrapper, isTablet && styles.inputWrapperTablet]}>
              <Image
                source={require('@/assets/images/sign_in/Email.png')} 
                style={[styles.icon, isTablet && styles.iconTablet]}
                resizeMode="contain"
              />
              <Text style={[styles.divider, isTablet && styles.dividerTablet]}>|</Text>
              <TextInput
                placeholder="Code (e.g. 123456)"
                placeholderTextColor="#8C7A6B"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                style={[styles.input, isTablet && styles.inputTablet]}
              />
            </View>

            {/* New Password Input Group */}
            <View style={[styles.inputWrapper, isTablet && styles.inputWrapperTablet]}>
              <Image
                source={require('@/assets/images/sign_in/Padlock.png')}
                style={[styles.icon, isTablet && styles.iconTablet]}
                resizeMode="contain"
              />
              <Text style={[styles.divider, isTablet && styles.dividerTablet]}>|</Text>
              <TextInput
                placeholder="New Password"
                placeholderTextColor="#8C7A6B"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                style={[styles.input, isTablet && styles.inputTablet]}
              />
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              onPress={handleReset}
              style={[styles.button, isTablet && styles.buttonTablet, loading && { opacity: 0.7 }]}
              disabled={loading}
            >
              <Text style={[styles.buttonText, isTablet && styles.buttonTextTablet]}>
                {loading ? "Updating..." : "Reset Password"}
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Grocery Bags Background Ornaments */}
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
    paddingTop: 200, 
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

  // --- Hanging Padlocks ---
  padlocksImage: {
    position: 'absolute',
    top: -10,
    width: '100%',  
    height: 260,
    zIndex: 0,
    marginBottom: 20,
  },
  padlocksImageTablet: {
    height: 380,
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
  emailText: {
    color: '#eee015ff', // Yellow highlight for the email
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
    includeFontPadding: false, 
    textAlignVertical: 'center',
  },

  // --- Background Decor (Bags) ---
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
    width: 130,
    height: 130,
  },
  bagRight: {
    width: 140,
    height: 140,
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
  bagLeftTablet: {
    width: 200,
    height: 200,
  },
  bagRightTablet: {
    width: 220,
    height: 220,
  },
});