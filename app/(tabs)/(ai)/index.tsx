import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendMessageToGemini } from '../../../services/geminiService.js';

export default function ChatScreen() {
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const flatListRef = useRef(null);       // For auto-scrolling
    const [messages, setMessages] = useState([]);

    // Load chat history when screen opens
    useEffect(() => {
        loadChatHistory();
    }, []);

    // Save chat history whenever 'messages' changes
    useEffect(() => {
        if (messages.length > 0) {
            saveChatHistory(messages);
        }
    }, [messages]);

    const loadChatHistory = async () => {
        try {
            const storedMessages = await AsyncStorage.getItem('chat_history');
            if (storedMessages) {
                setMessages(JSON.parse(storedMessages));
            } else {
                // If no history, set default welcome message
                setMessages([
                    { id: '1', text: 'Hello! I remember our past conversations now. How can I help?', sender: 'bot' },
                ]);
            }
        } catch (error) {
            console.error('Failed to load history', error);
        }
    };

    const saveChatHistory = async (newMessages) => {
        try {
            await AsyncStorage.setItem('chat_history', JSON.stringify(newMessages));
        } catch (error) {
            console.error('Failed to save history', error);
        }
    };

    const sendMessage = async () => {
        if (inputText.trim().length === 0) return;

        const userMsgText = inputText;
        const userMsgId = Date.now().toString();

        // Update UI immediately
        const updatedMessages = [...messages, { id: userMsgId, text: userMsgText, sender: 'user' }];
        setMessages(updatedMessages);
        
        setInputText('');
        setIsLoading(true);

        try {
            const botResponseText = await sendMessageToGemini(userMsgText);
            
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 1).toString(), text: botResponseText, sender: 'bot' }
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 1).toString(), text: "Sorry, something went wrong.", sender: 'bot' }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View
                style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.botBubble,
                ]}
            >
                <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
                    {item.text}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Ionicons name="arrow-back" size={24} color="#333" onPress={() => router.back()} />
                <Text style={styles.headerTitle}>AI Assistant</Text>
                <Ionicons name="menu" size={24} color="#333" />
            </View>

            {/* Main Content */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                {/* Message List */}
                <FlatList
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    style={{ flex: 1 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        placeholderTextColor="#888"
                    />
                    <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                        <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 4,
    },
    botBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#E5E5EA',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
    },
    userText: {
        color: '#FFFFFF',
    },
    botText: {
        color: '#000000',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#F0F0F0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 10,
        fontSize: 16,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: '#007AFF',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 16,
    },
});