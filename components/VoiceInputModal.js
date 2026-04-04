import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isTabletView = width > 710;

export default function VoiceInputModal({ visible, onClose, onComplete }) {
    const [isRecording, setIsRecording] = useState(false);
    const [liveVoiceText, setLiveVoiceText] = useState('');

    // Auto-start recording when the modal opens
    useEffect(() => {
        if (visible) {
            setLiveVoiceText('');
            startRecording();
        } else {
            ExpoSpeechRecognitionModule.abort();
            setIsRecording(false);
        }
    }, [visible]);

    // ==========================================
    // VOICE RECORDING LOGIC
    // ==========================================
    useSpeechRecognitionEvent("start", () => setIsRecording(true));
    useSpeechRecognitionEvent("end", () => setIsRecording(false));
    useSpeechRecognitionEvent("error", (event) => {
        console.log("Voice Error:", event.error, event.message);
        setIsRecording(false);
    });

    useSpeechRecognitionEvent("result", (event) => {
        const text = event.results[0]?.transcript || "";
        setLiveVoiceText(text);
    });

    const startRecording = async () => {
        try {
            const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!perm.granted) {
                alert("Microphone permission is required to use voice input!");
                return;
            }
            ExpoSpeechRecognitionModule.start({
                lang: "en-US",
                interimResults: true,
            });
        } catch (e) {
            console.error("Failed to start voice:", e);
        }
    };

    const handleDone = () => {
        ExpoSpeechRecognitionModule.stop();
        setIsRecording(false);
        if (onComplete) onComplete(liveVoiceText);
    };

    const handleCancel = () => {
        ExpoSpeechRecognitionModule.abort();
        setIsRecording(false);
        setLiveVoiceText('');
        if (onClose) onClose();
    };

    // ==========================================
    // ANIMATION
    // ==========================================
    const PulseAnimation = () => {
        const wave1 = useRef(new Animated.Value(1)).current;
        const wave2 = useRef(new Animated.Value(1)).current;
        const wave3 = useRef(new Animated.Value(1)).current;

        useEffect(() => {
            const createWave = (anim, delay) => {
                return Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.timing(anim, { toValue: 2.5, duration: 2000, useNativeDriver: true }),
                        Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true }),
                    ])
                );
            };

            const animations = [
                createWave(wave1, 0),
                createWave(wave2, 600),
                createWave(wave3, 1200)
            ];

            animations.forEach(anim => anim.start());
            return () => animations.forEach(anim => anim.stop());
        }, []);

        return (
            <View style={styles.pulseWrapper}>
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: wave1 }], opacity: wave1.interpolate({ inputRange: [1, 2.5], outputRange: [0.6, 0] }) }]} />
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: wave2 }], opacity: wave2.interpolate({ inputRange: [1, 2.5], outputRange: [0.6, 0] }) }]} />
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: wave3 }], opacity: wave3.interpolate({ inputRange: [1, 2.5], outputRange: [0.6, 0] }) }]} />
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            {/* Added KeyboardAvoidingView so the editable input doesn't get covered */}
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ImageBackground
                    source={require('@/assets/images/ai/AI_BG.png')}
                    style={styles.voiceModalContainer}
                    resizeMode="cover"
                >
                    <SafeAreaView style={styles.voiceModalSafeArea}>
                        <TouchableOpacity style={styles.voiceCloseButton} onPress={handleCancel}>
                            <Image
                                source={require('@/components/images/ExitButton.png')}
                                style={{ width: 40, height: 40 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>

                        <View style={styles.voiceModalContent}>
                            <Text style={styles.voiceTitleText}>
                                {isRecording ? "I'm listening..." : "Tap mic to speak"}
                            </Text>

                            <View style={styles.micAnimationContainer}>
                                {isRecording && <PulseAnimation />}

                                <TouchableOpacity
                                    onPress={isRecording ? () => ExpoSpeechRecognitionModule.stop() : startRecording}
                                    style={styles.bigMicButton}
                                >
                                    <Image
                                        source={
                                            isRecording
                                                ? require('@/components/images/MicOn.png')
                                                : require('@/components/images/MicOff.png')
                                        }
                                        style={styles.bigMicIcon}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Editable Text Input */}
                            <View style={styles.liveTextContainer}>
                                <TextInput
                                    style={styles.liveTextInput}
                                    value={liveVoiceText}
                                    onChangeText={setLiveVoiceText}
                                    placeholder="..."
                                    placeholderTextColor="#A0A0A0"
                                    multiline={true}
                                    editable={!isRecording} // Prevent editing while actively transcribing
                                />
                            </View>

                            <TouchableOpacity onPress={handleDone} style={styles.voiceConfirmButtonWrapper}>
                                <ImageBackground
                                    source={require('@/components/images/GeneralBlueButton.png')}
                                    style={styles.voiceConfirmButton}
                                    resizeMode="stretch"
                                >
                                    <Text style={styles.voiceConfirmText}>Done</Text>
                                </ImageBackground>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </ImageBackground>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    voiceModalContainer: {
        flex: 1,
        width: '100%',
        height: '100%'
    },
    voiceModalSafeArea: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 20,
    },
    voiceCloseButton: {
        alignSelf: 'flex-end',
        padding: 20,
    },
    voiceModalContent: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 50,
    },
    voiceTitleText: {
        fontSize: isTabletView ? 28 : 22,
        fontFamily: 'PixelFont',
        color: '#5C4033',
        marginBottom: 50,
        textAlign: 'center',
    },
    micAnimationContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    pulseWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseCircle: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E6D5B3',
    },
    bigMicButton: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF9E6',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        shadowColor: '#4A3525',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 8,
    },
    bigMicIcon: {
        width: 60,
        height: 60,
    },
    liveTextContainer: {
        width: '80%',
        minHeight: 80,
        maxHeight: 150,
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    liveTextInput: {
        width: '100%',
        fontSize: isTabletView ? 20 : 16,
        fontFamily: 'PixelFont',
        color: '#4A3525',
        textAlign: 'center',
        lineHeight: 24,
        minHeight: 40,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    voiceConfirmButtonWrapper: {
        width: 160,
        height: 50,
    },
    voiceConfirmButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    voiceConfirmText: {
        color: '#FFFFFF',
        fontFamily: 'PixelFont',
        fontSize: 16,
        includeFontPadding: false,
        textAlignVertical: 'center'
    }
});