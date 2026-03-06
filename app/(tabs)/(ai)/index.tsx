import { addListItems, batchAddListItems, createNewList, createUserPlan, fetchFridgeItems, fetchRecipes, fetchUserLists, fetchUserMealPlan, updateUserPlan } from '@/services/api.js';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

const SERVER_URL = 'http://192.168.100.34:3000/chat';

export default function ChatScreen() {
    // ==========================================
    // STATE & REFS
    // ==========================================
    const router = useRouter();
    const flatListRef = useRef(null);

    // Chat & User State
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [availableRecipes, setAvailableRecipes] = useState([]);
    const [userLists, setUserLists] = useState([]);

    // Form State
    const [showMealForm, setShowMealForm] = useState(false);
    const [formName, setFormName] = useState('');
    const [formDays, setFormDays] = useState(3);
    const [formMeals, setFormMeals] = useState({ breakfast: true, lunch: true, dinner: true });
    const [formAllergies, setFormAllergies] = useState('');
    const [formStartDate, setFormStartDate] = useState(new Date());
    const [formTargetFridge, setFormTargetFridge] = useState('ALL');

    const planStartDateRef = useRef(new Date());
    const targetFridgeRef = useRef('ALL');

    // ==========================================
    // INITIALIZATION & EFFECTS
    // ==========================================
    useEffect(() => {
        const initialize = async () => {
            try {
                const user = await getCurrentUser();
                setCurrentUserId(user.userId);

                const recipes = await fetchRecipes();
                if (recipes) setAvailableRecipes(recipes);

                const lists = await fetchUserLists(user.userId);
                if (lists) {
                    setUserLists(Array.isArray(lists) ? lists : (lists.data || lists.lists || []));
                }

            } catch (error) {
                console.error('User is not signed in', error);
            }
            await loadChatHistory();
        };
        initialize();
    }, []);

    useEffect(() => {
        if (messages.length > 0) saveChatHistory(messages);
    }, [messages]);


    // ==========================================
    // CHAT HISTORY MANAGEMENT
    // ==========================================
    const loadChatHistory = async () => {
        try {
            const stored = await AsyncStorage.getItem('chat_history');
            setMessages(stored ? JSON.parse(stored) : []);
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
            setMessages([]);
        } catch (error) {
            console.error('Failed to clear history', error);
        }
    };


    // ==========================================
    // MEAL PLAN FORM LOGIC
    // ==========================================
    const submitMealPlanForm = () => {
        setShowMealForm(false);

        const finalName = formName.trim() || 'My Meal Plan';
        const finalAllergies = formAllergies.trim() || 'None';
        const selectedMeals = Object.entries(formMeals)
            .filter(([_, isSelected]) => isSelected)
            .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
            .join(', ');

        planStartDateRef.current = formStartDate;
        targetFridgeRef.current = formTargetFridge;

        const engineeredPrompt = `Please create a ${formDays}-day meal plan for me starting on ${formStartDate.toDateString()}.\n• Name: "${finalName}"\n• Meals included per day: ${selectedMeals}\n• Allergies or restrictions: ${finalAllergies}\n\nPlease generate this using recipes from the catalog and save it!`;

        sendMessage(engineeredPrompt, true); // Send skipping the interceptor

        // Reset Form
        setFormName('');
        setFormDays(3);
        setFormMeals({ breakfast: true, lunch: true, dinner: true });
        setFormAllergies('');
        setFormStartDate(new Date());
        setFormTargetFridge('ALL');
    };


    // ==========================================
    // TOOL EXECUTION HELPERS
    // ==========================================

    // Extracted logic for the massive Create Meal Plan tool
    const processMealPlanTool = async (args) => {
        console.log(`\n=== STARTING MEAL PLAN CREATION ===`);
        console.log(`[1] AI provided arguments:`, JSON.stringify(args, null, 2));

        // Format Days & Match IDs
        // SAFETY CHECK: If the AI forgot to send 'days', don't crash!
        const rawDays = args.days || [];
        if (rawDays.length === 0) {
            console.error("ERROR: AI did not provide any days for the meal plan!");
            return { success: false, error: "AI failed to generate the days array." };
        }

        console.log(`[2] Formatting ${rawDays.length} days of meals...`);
        let populatedDays;
        try {
            // FIX 2: Added 'index' so we can calculate the exact date for each day!
            populatedDays = rawDays.map((d, index) => {

                // Calculate this specific day's date
                const specificDateObj = new Date(planStartDateRef.current);
                specificDateObj.setDate(specificDateObj.getDate() + index);

                // Format safely to YYYY-MM-DD using local time
                const year = specificDateObj.getFullYear();
                const month = String(specificDateObj.getMonth() + 1).padStart(2, '0');
                const day = String(specificDateObj.getDate()).padStart(2, '0');
                const localDateString = `${year}-${month}-${day}`;

                return {
                    day: d.dayLabel || `Day ${index + 1}`,
                    date: localDateString, // <--- FIX 3: INJECTED DATE FOR THE UI!
                    meals: (d.meals || []).map(m => {
                        const aiId = String(m.recipeId || "").replace(/\\/g, '').toLowerCase().replace('in_', 'ln_').trim();
                        const fullRecipe = availableRecipes.find(r => String(r.id || r._id || r.recipeId).toLowerCase() === aiId)
                            || { name: 'Unknown Recipe', ingredients: [] };
                        return {
                            type: m.type,
                            recipe: fullRecipe,
                            slotId: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                        };
                    })
                };
            });

            // Fix Floats for Python Lambda
            populatedDays = JSON.parse(JSON.stringify(populatedDays, (k, v) => typeof v === 'number' ? String(v) : v));
            console.log(`Formatting complete.`);
        } catch (formatErr) {
            console.error("ERROR while formatting recipes:", formatErr);
            return { success: false, error: "Failed parsing recipe IDs." };
        }

        // Calculate Dates
        const startDateObj = new Date(planStartDateRef.current);
        const endDateObj = new Date(startDateObj);

        const daysToPlan = populatedDays.length > 0 ? populatedDays.length : formDays;
        endDateObj.setDate(startDateObj.getDate() + daysToPlan - 1);
        endDateObj.setHours(23, 59, 59, 999); // Push to 11:59 PM to stop auto-delete

        // Use local formatting for the start ID, but full ISO timestamp for the end time
        const startYear = startDateObj.getFullYear();
        const startMonth = String(startDateObj.getMonth() + 1).padStart(2, '0');
        const startDay = String(startDateObj.getDate()).padStart(2, '0');

        const startStr = `${startYear}-${startMonth}-${startDay}`;
        const endStr = endDateObj.toISOString();

        // Create List
        let targetListId = targetFridgeRef.current;
        const listName = args.planName ? `${args.planName} Groceries` : `AI Groceries`;

        console.log(`[3] Attempting to create new Grocery List named: "${listName}"`);
        try {
            const listResponse = await createNewList(currentUserId, listName, '#7A9B6B');
            targetListId = listResponse?.data?.listId || listResponse?.data?.id || listResponse?.listId || "ALL";
            console.log(`List created successfully! ID: ${targetListId}`);
        } catch (error) {
            console.error("List creation failed:", error);
        }

        // Aggregate Ingredients
        console.log(`[4] Aggregating ingredients from recipes...`);
        if (targetListId !== "ALL") {
            const aggregator = new Map();
            populatedDays.forEach(day => {
                day.meals.forEach(meal => {
                    meal.recipe?.ingredients?.forEach(ing => {
                        const cleanName = (ing.groceryName || ing.name || "Unknown Item").trim();
                        const lowerName = cleanName.toLowerCase();
                        if (!aggregator.has(lowerName)) {
                            aggregator.set(lowerName, { name: cleanName, category: ing.category || "Uncategorized", shelfLife: ing.shelfLife || "7", measurements: [] });
                        }
                        aggregator.get(lowerName).measurements.push({ amount: parseFloat(ing.amount) || 0, unit: (ing.unit || "").trim().toLowerCase() });
                    });
                });
            });

            const finalIngredients = [];
            aggregator.forEach(data => {
                const unitTotals = new Map();
                const textOnlyUnits = [];
                data.measurements.forEach(m => {
                    if (m.amount > 0) unitTotals.set(m.unit, (unitTotals.get(m.unit) || 0) + m.amount);
                    else if (m.unit) textOnlyUnits.push(m.unit);
                });
                const parts = [];
                unitTotals.forEach((total, unit) => parts.push(`${Math.round(total * 100) / 100} ${unit}`.trim()));
                [...new Set(textOnlyUnits)].forEach(u => parts.push(u));
                finalIngredients.push({ name: data.name, quantity: parts.join(", "), category: data.category, shelfLife: data.shelfLife });
            });

            console.log(`[5] Adding ${finalIngredients.length} unique ingredients to list ${targetListId}...`);
            try {
                await batchAddListItems(targetListId, finalIngredients);
                console.log(`Ingredients added successfully.`);
            } catch (error) {
                console.error("Adding items failed:", error);
            }
        }

        console.log(`[6] Checking for existing active meal plan...`);
        let existingPlan = null;
        try {
            existingPlan = await fetchUserMealPlan(currentUserId);
        } catch (error) {
            console.warn("No existing plan found or failed to fetch.");
        }

        const isUpdating = existingPlan && existingPlan.planData;
        let finalDays = populatedDays;
        let finalStartStr = startStr;
        let finalEndStr = endStr;
        let finalFridges = targetListId === "ALL" ? ["ALL"] : [targetListId];

        if (isUpdating) {
            console.log(`[7] Found ongoing plan! Merging new days into it...`);
            
            // Map by Date string to avoid duplicates and allow safe overwriting
            const daysMap = new Map();
            
            // Add all the existing days first
            existingPlan.planData.forEach(d => {
                daysMap.set(d.date, JSON.parse(JSON.stringify(d)));
            });
            
            // Overwrite / Add the newly generated days
            populatedDays.forEach(newDay => {
                if (daysMap.has(newDay.date)) {
                    const existingDay = daysMap.get(newDay.date);
                    existingDay.meals = [...(existingDay.meals || []), ...(newDay.meals || [])];
                    daysMap.set(newDay.date, existingDay);
                } else {
                    // Brand new day, add it to the map
                    daysMap.set(newDay.date, newDay);
                }
            });

            // Convert back to array and sort chronologically!
            finalDays = Array.from(daysMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
            const mealOrder = { 'Breakfast': 1, 'Lunch': 2, 'Dinner': 3 };
            
            finalDays.forEach(day => {
                if (day.meals && Array.isArray(day.meals)) {
                    day.meals.sort((a, b) => {
                        // Look up the order number, default to 99 if it's an unknown type (like 'Snack')
                        const orderA = mealOrder[a.type] || 99;
                        const orderB = mealOrder[b.type] || 99;
                        return orderA - orderB;
                    });
                }
            });
            
            // Stretch the Start and End boundaries to fit the combined plan
            const existingStartObj = new Date(existingPlan.startDate);
            const newStartObj = new Date(startStr);
            finalStartStr = existingStartObj < newStartObj ? existingPlan.startDate : startStr;

            const existingEndObj = new Date(existingPlan.endDate);
            const newEndObj = new Date(endStr);
            finalEndStr = existingEndObj > newEndObj ? existingPlan.endDate : endStr;

            // MERGE FRIDGES: Combine old fridges with the new fridge target
            const mergedFridges = new Set([...(existingPlan.targetFridges || []), ...finalFridges]);
            finalFridges = Array.from(mergedFridges);
        }

        // Create Plan
        const planPayload = {
            userId: currentUserId,
            startDate: startStr,
            endDate: endStr,
            days: finalDays,
            planData: finalDays,
            targetFridges: targetListId === "ALL" ? ["ALL"] : [targetListId]
        };

        try {
            if (isUpdating) {
                console.log(`Sending UPDATE to AWS UserPlans table...`);
                planPayload.planId = existingPlan.planId;
                
                await updateUserPlan(planPayload);
                console.log(`Meal plan updated successfully!`);
                return { success: true, message: `Successfully added the new days to your ongoing meal plan and updated "${listName}".` };
            } else {
                console.log(`Sending NEW Meal Plan to AWS UserPlans table...`);
                await createUserPlan(planPayload);
                console.log(`New meal plan saved successfully!`);
                return { success: true, message: `Successfully created a brand new plan & list "${listName}".` };
            }
        } catch (error) {
            console.error("Plan creation/update failed:", error);
            return { success: false, error: "Created list, but failed to save meal plan." };
        }
    };

    // Main Tool Router
    const executeLocalTool = async (fnName, args) => {
        console.log(`Executing tool locally: ${fnName}`);

        switch (fnName) {
            case 'get_user_lists':
                return { success: true, lists: await fetchUserLists(currentUserId) };
            case 'create_new_list':
                return await createNewList(currentUserId, args.listName, args.color || '#007AFF');
            case 'add_to_list':
                return { success: true, data: await addListItems(args.listId, args.item, args.quantity || "1", args.category || "Uncategorized", args.shelfLife || null) };
            case 'get_recipes':
                return { success: true, catalog: await fetchRecipes(args.mealType) };
            case 'get_fridge_items':
                return { success: true, items: await fetchFridgeItems(args.listId) };
            case 'create_meal_plan':
                return await processMealPlanTool(args);
            default:
                return { success: false, error: `Tool ${fnName} not recognized.` };
        }
    };


    // ==========================================
    // MAIN CHAT LOGIC (API CALLS)
    // ==========================================
    const sendMessage = async (presetText, isSystemPrompt = false) => {
        const userMsgText = typeof presetText === 'string' ? presetText : inputText;
        if (userMsgText.trim().length === 0) return;

        // --- Interceptor Logic ---
        if (!isSystemPrompt) {
            const lowerText = userMsgText.toLowerCase();

            // Looks for any combination of these action words near "meal plan"
            const isMealPlanRequest = /(create|make|generate|build|new|plan|want|need).*meal plan/i.test(lowerText) || lowerText.includes('meal plan for');

            // If the user is asking to create a plan, pop up the form and STOP sending!
            if (isMealPlanRequest) {
                setShowMealForm(true);
                setInputText(''); // Clear the text box
                return;
            }
        }

        const currentHistory = [...messages, { id: Date.now().toString(), text: userMsgText, sender: 'user' }];
        setMessages(currentHistory);
        setInputText('');
        setIsLoading(true);

        try {
            let isConversationDone = false;
            let currentIntermediateSteps = [];

            while (!isConversationDone) {

                const requestBody = {
                    message: userMsgText,
                    history: currentHistory,
                    recipes: availableRecipes,
                    intermediateSteps: currentIntermediateSteps
                };

                const response = await fetch(SERVER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (data.action === 'tool_call') {
                    const originalPart = data.originalPart;
                    const fn = originalPart.functionCall;

                    // Execute the tool locally
                    const toolResultData = await executeLocalTool(fn.name, fn.args || {});

                    // NEW: Add this execution to the scratchpad so the AI remembers it!
                    currentIntermediateSteps.push({
                        originalPart: originalPart,
                        functionResponse: { name: fn.name, response: toolResultData }
                    });

                } else if (data.action === 'reply') {
                    const cleanReply = data.reply ? data.reply.replace(/\\/g, '') : "";
                    setMessages(prev => [...prev, { id: Date.now().toString(), text: cleanReply, sender: 'bot' }]);

                    isConversationDone = true;
                } else {
                    isConversationDone = true;
                }
            }

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { id: Date.now().toString(), text: "Sorry, I ran into an error processing that.", sender: 'bot' }]);
        } finally {
            setIsLoading(false);
        }
    };


    // ==========================================
    // UI SUB-COMPONENTS
    // ==========================================
    const renderWelcomeScreen = () => (
        <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>How can I help you?</Text>
            <View style={styles.suggestionsGrid}>
                <TouchableOpacity style={styles.suggestionButton} onPress={() => setShowMealForm(true)}>
                    <Ionicons name="calendar-outline" size={22} color="#7A9B6B" />
                    <Text style={styles.suggestionText}>Create a meal plan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionButton} onPress={() => sendMessage("I need to add some items to my grocery list.")}>
                    <Ionicons name="cart-outline" size={22} color="#7A9B6B" />
                    <Text style={styles.suggestionText}>Add to grocery list</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionButton} onPress={() => sendMessage("What can I make with the ingredients in my fridge?")}>
                    <Ionicons name="snow-outline" size={22} color="#7A9B6B" />
                    <Text style={styles.suggestionText}>Cook from my fridge</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionButton} onPress={() => sendMessage("Can you suggest a healthy dinner recipe?")}>
                    <Ionicons name="restaurant-outline" size={22} color="#7A9B6B" />
                    <Text style={styles.suggestionText}>Suggest a recipe</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderItem = ({ item }) => (
        <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
            {item.sender === 'user' ? (
                <Text style={[styles.messageText, styles.userText]}>{item.text}</Text>
            ) : (
                <Markdown style={botMarkdownStyles}>{item.text}</Markdown>
            )}
        </View>
    );

    // Helper to generate the next 7 days dynamically
    const generateDateOptions = () => {
        const options = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            let label = '';
            if (i === 0) label = 'Today';
            else if (i === 1) label = 'Tomorrow';
            else label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            options.push({ date: d, label });
        }
        return options;
    };

    const renderMealPlanModal = () => {
        const dateOptions = generateDateOptions();

        return (
            <Modal visible={showMealForm} transparent animationType="fade">
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Plan Details</Text>
                            <Ionicons name="close" size={26} color="#333" onPress={() => setShowMealForm(false)} />
                        </View>

                        <Text style={styles.inputLabel}>Plan Name (Optional)</Text>
                        <TextInput style={styles.modalInput} placeholder="e.g., Gym Week, AI Trail" value={formName} onChangeText={setFormName} placeholderTextColor="#A0A0A0" />

                        {/* Start Date Scroller */}
                        <Text style={styles.inputLabel}>Start Date</Text>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={dateOptions}
                            keyExtractor={(item) => item.label}
                            contentContainerStyle={{ gap: 10, paddingVertical: 5 }}
                            renderItem={({ item }) => {
                                const isActive = formStartDate.toDateString() === item.date.toDateString();
                                return (
                                    <TouchableOpacity
                                        style={[styles.pill, isActive && styles.pillActive]}
                                        onPress={() => setFormStartDate(item.date)}
                                    >
                                        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />

                        {/* Existing Duration Pills */}
                        <Text style={styles.inputLabel}>Duration (Days)</Text>
                        <View style={styles.pillContainer}>
                            {[1, 2, 3, 5, 7].map(day => (
                                <TouchableOpacity key={day} style={[styles.pill, formDays === day && styles.pillActive]} onPress={() => setFormDays(day)}>
                                    <Text style={[styles.pillText, formDays === day && styles.pillTextActive]}>{day}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Choose Target Fridge List */}
                        <Text style={styles.inputLabel}>Add Groceries To</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 5 }}>
                            <TouchableOpacity
                                style={[styles.pill, formTargetFridge === 'ALL' && styles.pillActive]}
                                onPress={() => setFormTargetFridge('ALL')}
                            >
                                <Text style={[styles.pillText, formTargetFridge === 'ALL' && styles.pillTextActive]}>All (Default)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.pill, formTargetFridge === 'CREATE_NEW' && styles.pillActive]}
                                onPress={() => setFormTargetFridge('CREATE_NEW')}
                            >
                                <Text style={[styles.pillText, formTargetFridge === 'CREATE_NEW' && styles.pillTextActive]}>Current List</Text>
                            </TouchableOpacity>

                            {/* Map out their existing fridges/lists */}
                            {userLists.map(list => {
                                const listId = list.listId || list.id || list._id;
                                const listName = list.listName || list.name || "Unnamed List";
                                const isActive = formTargetFridge === listId;
                                return (
                                    <TouchableOpacity
                                        key={listId}
                                        style={[styles.pill, isActive && styles.pillActive]}
                                        onPress={() => setFormTargetFridge(listId)}
                                    >
                                        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{listName}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Meals Included (Breakfast, Lunch, Dinner) */}
                        <Text style={styles.inputLabel}>Meals Included</Text>
                        <View style={styles.pillContainer}>
                            {['breakfast', 'lunch', 'dinner'].map(meal => {
                                const isActive = formMeals[meal];
                                return (
                                    <TouchableOpacity key={meal} style={[styles.pill, isActive && styles.pillActive]} onPress={() => setFormMeals(prev => ({ ...prev, [meal]: !isActive }))}>
                                        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.inputLabel}>Allergies / Restrictions</Text>
                        <TextInput style={styles.modalInput} placeholder="e.g., Peanuts, Vegan, None" value={formAllergies} onChangeText={setFormAllergies} placeholderTextColor="#A0A0A0" />

                        <TouchableOpacity style={styles.submitFormButton} onPress={submitMealPlanForm}>
                            <Text style={styles.submitFormText}>Generate Plan</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        );
    };


    // ==========================================
    // MAIN RENDER
    // ==========================================
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

            {/* Chat Content */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
                {messages.length === 0 ? renderWelcomeScreen() : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        style={{ flex: 1 }}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    />
                )}

                {/* Text Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Type a message..."
                        multiline={true} placeholderTextColor="#888"
                        onFocus={() => { setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 200); }}
                    />
                    <TouchableOpacity onPress={sendMessage} style={styles.sendButton} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.sendButtonText}>Send</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Overlays */}
            {renderMealPlanModal()}

        </SafeAreaView>
    );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    header: { padding: 16, flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
    welcomeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    welcomeTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 30, textAlign: 'center' },
    suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', gap: 12 },
    suggestionButton: { width: '48%', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#EFEFEF' },
    suggestionText: { marginTop: 10, fontSize: 14, fontWeight: '500', color: '#444', lineHeight: 20 },
    listContent: { padding: 16, paddingBottom: 20 },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20, marginBottom: 10 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
    botBubble: { alignSelf: 'flex-start', backgroundColor: '#E5E5EA', borderBottomLeftRadius: 4 },
    messageText: { fontSize: 16 },
    userText: { color: '#FFFFFF' },
    inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0E0E0', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, fontSize: 16, maxHeight: 100 },
    sendButton: { backgroundColor: '#007AFF', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 20 },
    sendButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 20 },
    modalInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0' },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    pill: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#F0F0F0', borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0' },
    pillActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    pillText: { fontSize: 14, color: '#555', fontWeight: '600' },
    pillTextActive: { color: '#FFFFFF' },
    submitFormButton: { backgroundColor: '#007AFF', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 30 },
    submitFormText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});

const botMarkdownStyles = {
    body: { fontSize: 16, color: '#000000' },
    paragraph: { marginTop: 0, marginBottom: 10 },
    strong: { fontWeight: 'bold' },
    bullet_list: { marginBottom: 10 },
    table: { borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 8, marginTop: 5, marginBottom: 10 },
    th: { backgroundColor: '#D1D1D6', padding: 8, fontWeight: 'bold', textAlign: 'left' },
    tr: { borderBottomWidth: 1, borderColor: '#E0E0E0' },
    td: { padding: 8 }
};