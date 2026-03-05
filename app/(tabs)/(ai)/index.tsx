import { addListItems, batchAddListItems, createNewList, createUserPlan, fetchFridgeItems, fetchRecipes, fetchUserLists } from '@/services/api.js';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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

const SERVER_URL = 'http://192.168.100.34:3000/chat';

export default function ChatScreen() {
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const flatListRef = useRef(null);       // For auto-scrolling
    const [messages, setMessages] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null); 
    const [availableRecipes, setAvailableRecipes] = useState([]);

    // Initialize Auth, Chat History, and Recipes
    useEffect(() => {
        const initialize = async () => {
            try {
                const user = await getCurrentUser();
                setCurrentUserId(user.userId); 

                const recipes = await fetchRecipes();
                if (recipes) {
                    setAvailableRecipes(recipes);
                }
            } catch (error) {
                console.error('User is not signed in', error);
            }
            await loadChatHistory();
        };
        initialize();
    }, []);

    // Save chat history whenever 'messages' changes
    useEffect(() => {
        if (messages.length > 0) {
            saveChatHistory(messages);
        }
    }, [messages]);

    // ==================================
    // Chat History Helper
    // ==================================
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
    
    const clearHistory = async () => {
        try {
            await AsyncStorage.removeItem('chat_history');
            setMessages([{ id: Date.now().toString(), text: 'Chat history cleared. How can I help you?', sender: 'bot' }]);
        } catch (error) {
            console.error('Failed to clear history', error);
        }
    };

    // ==================================
    // Send Message Logic
    // ==================================
    const sendMessage = async () => {
        if (inputText.trim().length === 0) return;

        const userMsgText = inputText;
        const currentHistory = [...messages, { id: Date.now().toString(), text: userMsgText, sender: 'user' }];
        
        setMessages(currentHistory);
        setInputText('');
        setIsLoading(true);

        try {
            // --- SEND NORMAL MESSAGE ---
            const response = await fetch(SERVER_URL, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userMsgText, 
                    history: currentHistory,
                    recipes: availableRecipes
                })
            });
            
            const data = await response.json();

            // --- CHECK IF TOOL NEEDED ---
            if (data.action === 'tool_call') {
                const originalPart = data.originalPart;
                const fn = originalPart.functionCall;
                const args = fn.args || {};
                let toolResultData;

                console.log(`Executing tool locally: ${fn.name}`);

                // --- EXECUTE LOCAL API FUNCTIONS ---
                if (fn.name === 'get_user_lists') {
                    const lists = await fetchUserLists(currentUserId); 
                    toolResultData = { success: true, lists: lists };
                }
                
                else if (fn.name === 'create_new_list') {
                    const result = await createNewList(currentUserId, args.listName, args.color || '#007AFF');
                    toolResultData = result; 
                }

                else if (fn.name === 'add_to_list') {
                    const result = await addListItems(
                        args.listId, 
                        args.item, 
                        args.quantity || "1", 
                        args.category || "Uncategorized", 
                        args.shelfLife || null
                    );
                    toolResultData = { success: true, data: result };
                }
                
                else if (fn.name === 'get_recipes') {
                    const recipes = await fetchRecipes(args.mealType);
                    toolResultData = { success: true, catalog: recipes };
                } 

                else if (fn.name === 'get_fridge_items') {
                    const fridgeData = await fetchFridgeItems(args.listId);
                    toolResultData = { success: true, items: fridgeData };
                }

                else if (fn.name === 'create_meal_plan') {
                    console.log(`AI is building meal plan...`);

                    // Reconstruct days by matching the recipe ID
                    let populatedDays = args.days.map(d => ({
                        day: d.dayLabel,
                        meals: d.meals.map(m => {
                            const aiId = String(m.recipeId || "")
                                .replace(/\\/g, '')
                                .toLowerCase()
                                .replace('in_', 'ln_')
                                .trim(); 
                            
                            const fullRecipe = availableRecipes.find(r => {
                                const dbId = String(r.id || r._id || r.recipeId).toLowerCase();
                                return dbId === aiId;
                            }) || { name: 'Unknown Recipe', ingredients: [] };
                            
                            return { type: m.type, recipe: fullRecipe };
                        })
                    }));

                    populatedDays = JSON.parse(JSON.stringify(populatedDays, (key, value) => 
                        typeof value === 'number' ? String(value) : value
                    ));

                    const startDateObj = new Date();
                    const endDateObj = new Date();
                    endDateObj.setDate(startDateObj.getDate() + populatedDays.length - 1);
                    
                    const startStr = startDateObj.toISOString().split('T')[0];
                    const endStr = endDateObj.toISOString().split('T')[0];

                    // CREATE THE LIST
                    const listName = args.planName ? `${args.planName} Groceries` : `AI Groceries`;
                    let newListId = "ALL"; 
                    
                    try {
                        console.log(`Creating list: ${listName}...`);
                        const listResponse = await createNewList(currentUserId, listName, '#7A9B6B');
                        newListId = listResponse?.data?.listId || listResponse?.data?.id || listResponse?.listId || "ALL";
                    } catch (listError) {
                        console.error("Failed to create list:", listError);
                    }

                    // TALLY AND ADD INGREDIENTS 
                    if (newListId !== "ALL") {
                        const aggregator = new Map();
                        populatedDays.forEach(day => {
                            day.meals.forEach(meal => {
                                if (meal.recipe && meal.recipe.ingredients) {
                                    meal.recipe.ingredients.forEach(ing => {
                                        const cleanName = (ing.groceryName || ing.name || "Unknown Item").trim();
                                        const lowerName = cleanName.toLowerCase();
                                        const category = ing.category || "Uncategorized";
                                        const shelfLife = ing.shelfLife || "7";
                                        const amount = parseFloat(ing.amount) || 0;
                                        const unit = (ing.unit || "").trim().toLowerCase();

                                        if (!aggregator.has(lowerName)) {
                                            aggregator.set(lowerName, { name: cleanName, category, shelfLife, measurements: [] });
                                        }
                                        aggregator.get(lowerName).measurements.push({ amount, unit });
                                    });
                                }
                            });
                        });

                        const finalIngredients = [];
                        aggregator.forEach((data) => {
                            const unitTotals = new Map();
                            const textOnlyUnits = [];
                            data.measurements.forEach(m => {
                                if (m.amount > 0) {
                                    unitTotals.set(m.unit, (unitTotals.get(m.unit) || 0) + m.amount);
                                } else {
                                    if (m.unit) textOnlyUnits.push(m.unit);
                                }
                            });

                            const parts = [];
                            unitTotals.forEach((total, unit) => parts.push(`${Math.round(total * 100) / 100} ${unit}`.trim()));
                            [...new Set(textOnlyUnits)].forEach(u => parts.push(u));

                            finalIngredients.push({
                                name: data.name,
                                quantity: parts.join(", ") || "",
                                category: data.category,
                                shelfLife: data.shelfLife
                            });
                        });

                        try {
                            console.log(`Adding ${finalIngredients.length} items to list ${newListId}...`);
                            await batchAddListItems(newListId, finalIngredients);
                        } catch (itemError) {
                            console.error("Failed to add items to list:", itemError);
                        }
                    }

                    // CREATE THE MEAL PLAN
                    const createPayload = {
                        userId: currentUserId,
                        startDate: startStr,
                        endDate: endStr,
                        days: populatedDays,
                        targetFridges: [newListId] 
                    };

                    try {
                        console.log("Sending meal plan to AWS...");
                        const result = await createUserPlan(createPayload);
                        
                        toolResultData = { 
                            success: true, 
                            data: result, 
                            message: `Successfully created the meal plan and populated the grocery list named "${listName}".` 
                        };
                    } catch (planError) {
                        console.error("Failed to create UserPlan:", planError);
                        toolResultData = { success: false, error: "Created list, but failed to save meal plan." };
                    }
                }

                // Send the result BACK to the server
                const secondResponse = await fetch(SERVER_URL, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: userMsgText,
                        history: currentHistory,
                        recipes: availableRecipes,
                        originalPart: originalPart, 
                        functionResponse: { 
                            name: fn.name, 
                            response: toolResultData 
                        }
                    })
                });

                const finalData = await secondResponse.json();
                const cleanFinalReply = finalData.reply ? finalData.reply.replace(/\\/g, '') : "Done!";
                
                // Append Gemini's final confirmation message to the chat
                setMessages((prev) => [
                    ...prev,
                    { id: Date.now().toString(), text: cleanFinalReply, sender: 'bot' }
                ]);

            } else if (data.action === 'reply') {
                const cleanReply = data.reply ? data.reply.replace(/\\/g, '') : "";

                // Normal text response (no tools needed)
                setMessages((prev) => [
                    ...prev,
                    { id: Date.now().toString(), text: cleanReply.reply, sender: 'bot' }
                ]);
            }

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), text: "Sorry, I ran into an error processing that.", sender: 'bot' }
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
                <View style={{ flexDirection: 'row', gap: 15 }}>
                     <Ionicons name="trash-outline" size={24} color="#FF3B30" onPress={clearHistory} />
                     <Ionicons name="menu" size={24} color="#333" />
                </View>
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
                        multiline={true}
                        placeholderTextColor="#888"
                    />
                    <TouchableOpacity onPress={sendMessage} style={styles.sendButton} disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.sendButtonText}>Send</Text>
                        )}
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