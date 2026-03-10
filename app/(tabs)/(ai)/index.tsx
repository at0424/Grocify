import {
    addListItems,
    batchAddListItems,
    createNewList,
    createUserPlan,
    fetchFridgeItems,
    fetchRecipes,
    fetchUserLists,
    fetchUserMealPlan,
    updateUserPlan
} from '@/services/api.js';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    ImageBackground,
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
    const [showFridgeForm, setShowFridgeForm] = useState(false);
    const [cookTargetFridge, setCookTargetFridge] = useState('ALL');
    
    const COLORS = ['#FFF9C4', '#E1F5FE', '#FFEBEE', '#E8F5E9', '#F3E5F5'];
    const [formColor, setFormColor] = useState(COLORS[3]);
    
    const [isAdvancedMeals, setIsAdvancedMeals] = useState(false);
    const [advancedMeals, setAdvancedMeals] = useState(
        // Pre-fill an array for up to 7 days to track individual daily selections
        Array.from({ length: 7 }, () => ({ breakfast: true, lunch: true, dinner: true }))
    );

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

    // Helper to toggle specific meals on specific days
    const toggleAdvancedMeal = (dayIndex, mealType) => {
        setAdvancedMeals(prev => {
            const newMeals = [...prev];
            newMeals[dayIndex] = {
                ...newMeals[dayIndex],
                [mealType]: !newMeals[dayIndex][mealType]
            };
            return newMeals;
        });
    };

    const submitMealPlanForm = () => {
        setShowMealForm(false);

        const finalName = formName.trim() || 'My Meal Plan';
        const finalAllergies = formAllergies.trim() || 'None';

        let mealsPromptText = "";
        if (isAdvancedMeals) {
            mealsPromptText = Array.from({ length: formDays }).map((_, i) => {
                const dayMeals = Object.entries(advancedMeals[i])
                    .filter(([_, isSelected]) => isSelected)
                    .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
                    .join(', ');
                return `Day ${i + 1}: ${dayMeals || 'None'}`;
            }).join(' | ');
        } else {
            mealsPromptText = "Every day: " + Object.entries(formMeals)
                .filter(([_, isSelected]) => isSelected)
                .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
                .join(', ');
        }

        planStartDateRef.current = formStartDate;
        targetFridgeRef.current = formTargetFridge;

        // What the user SEES
        const displayText = `Please create a ${formDays}-day meal plan named "${finalName}".`;
        
        // What the AI SEES
        const engineeredPrompt = `Please create a ${formDays}-day meal plan for me starting on ${formStartDate.toDateString()}.\n• Name: "${finalName}"\n• Meals included: ${mealsPromptText}\n• Allergies or restrictions: ${finalAllergies}\n\nPlease generate this using recipes from the catalog and save it!`;

        sendMessage(displayText, true, engineeredPrompt);

        // Reset Form
        setFormName('');
        setFormDays(3);
        setFormMeals({ breakfast: true, lunch: true, dinner: true });
        setFormAllergies('');
        setFormStartDate(new Date());
        setFormTargetFridge('ALL');
        setFormColor(COLORS[3]);
    };

    // ==========================================
    // COOK FROM FRIDGE LOGIC
    // ==========================================
    const submitFridgeCookRequest = () => {
        setShowFridgeForm(false);

        const selectedList = cookTargetFridge !== 'ALL' 
            ? userLists.find(list => (list.listId || list.id || list._id) === cookTargetFridge) 
            : null;
        
        const listName = selectedList ? (selectedList.listName || selectedList.name) : "All Lists";

        // What the user SEES in the chat bubble
        const displayText = cookTargetFridge === 'ALL'
            ? "What can I make with the ingredients in my fridge?"
            : `What can I make with the ingredients in "${listName}"?`;

        // What the AI SEES in the backend
        let hiddenPrompt = "I want to cook from my fridge. Please check ALL of my grocery lists. DO NOT ask me which list to choose. Use your tools to pick a list, check it silently, and immediately suggest exactly ONE recipe I can make right now. Do not format this as a daily meal plan.";
        
        if (cookTargetFridge !== 'ALL') {
            hiddenPrompt = `I want to cook from my fridge. You MUST immediately call the 'get_fridge_items' tool specifically for the list named "${listName}" (ID: ${cookTargetFridge}). Read the items carefully. Even if there are only 1 or 2 random ingredients, DO NOT say the list is empty. Invent exactly ONE creative recipe I can make with whatever is there. Do not format this as a daily meal plan.`;
        }

        sendMessage(displayText, true, hiddenPrompt);
        setCookTargetFridge('ALL');
    };

    // ==========================================
    // TOOL EXECUTION HELPERS
    // ==========================================

    const processMealPlanTool = async (args) => {
        console.log(`\n=== STARTING MEAL PLAN CREATION ===`);
        console.log(`[1] AI provided arguments:`, JSON.stringify(args, null, 2));

        const rawDays = args.days || [];
        if (rawDays.length === 0) {
            console.error("ERROR: AI did not provide any days for the meal plan!");
            return { success: false, error: "AI failed to generate the days array." };
        }

        console.log(`[2] Formatting ${rawDays.length} days of meals...`);
        let populatedDays;
        try {
            populatedDays = rawDays.map((d, index) => {
                const specificDateObj = new Date(planStartDateRef.current);
                specificDateObj.setDate(specificDateObj.getDate() + index);

                const year = specificDateObj.getFullYear();
                const month = String(specificDateObj.getMonth() + 1).padStart(2, '0');
                const day = String(specificDateObj.getDate()).padStart(2, '0');
                const localDateString = `${year}-${month}-${day}`;

                return {
                    day: d.dayLabel || `Day ${index + 1}`,
                    date: localDateString, 
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

            populatedDays = JSON.parse(JSON.stringify(populatedDays, (k, v) => typeof v === 'number' ? String(v) : v));
            console.log(`Formatting complete.`);
        } catch (formatErr) {
            console.error("ERROR while formatting recipes:", formatErr);
            return { success: false, error: "Failed parsing recipe IDs." };
        }

        const startDateObj = new Date(planStartDateRef.current);
        const endDateObj = new Date(startDateObj);

        const daysToPlan = populatedDays.length > 0 ? populatedDays.length : formDays;
        endDateObj.setDate(startDateObj.getDate() + daysToPlan - 1);
        endDateObj.setHours(23, 59, 59, 999); 

        const startYear = startDateObj.getFullYear();
        const startMonth = String(startDateObj.getMonth() + 1).padStart(2, '0');
        const startDay = String(startDateObj.getDate()).padStart(2, '0');

        const startStr = `${startYear}-${startMonth}-${startDay}`;
        const endStr = endDateObj.toISOString();

        let targetListId = targetFridgeRef.current;
        const listName = args.planName ? `${args.planName} Groceries` : `AI Groceries`;

        console.log(`[3] Attempting to create new Grocery List named: "${listName}"`);
        try {
            const listResponse = await createNewList(currentUserId, listName, formColor);
            targetListId = listResponse?.data?.listId || listResponse?.data?.id || listResponse?.listId || "ALL";
            console.log(`List created successfully! ID: ${targetListId}`);
        } catch (error) {
            console.error("List creation failed:", error);
        }

        console.log(`[4] Aggregating ingredients from recipes...`);
        if (targetListId !== "ALL") {
            const aggregator = new Map();
            populatedDays.forEach(day => {
                day.meals.forEach(meal => {
                    meal.recipe?.ingredients?.forEach(ing => {
                        const cleanName = (ing.groceryName || ing.name || "Unknown Item").trim();
                        const lowerName = cleanName.toLowerCase();
                        if (!aggregator.has(lowerName)) {
                            aggregator.set(lowerName, {
                                name: cleanName,
                                category: ing.groceryCategory || ing.category || "Uncategorized",
                                shelfLife: ing.shelfLife || "7",
                                measurements: []
                            });
                        }
                        aggregator.get(lowerName).measurements.push({ 
                            amount: parseFloat(ing.amount) || 0, 
                            unit: (ing.unit || "").trim().toLowerCase() 
                        });
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
                finalIngredients.push({ 
                    name: data.name, 
                    quantity: parts.join(", "), 
                    category: data.category, 
                    shelfLife: data.shelfLife 
                });
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
            const daysMap = new Map();

            existingPlan.planData.forEach(d => {
                daysMap.set(d.date, JSON.parse(JSON.stringify(d)));
            });

            populatedDays.forEach(newDay => {
                if (daysMap.has(newDay.date)) {
                    const existingDay = daysMap.get(newDay.date);
                    existingDay.meals = [...(existingDay.meals || []), ...(newDay.meals || [])];
                    daysMap.set(newDay.date, existingDay);
                } else {
                    daysMap.set(newDay.date, newDay);
                }
            });

            finalDays = Array.from(daysMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
            const mealOrder = { 'Breakfast': 1, 'Lunch': 2, 'Dinner': 3 };

            finalDays.forEach(day => {
                if (day.meals && Array.isArray(day.meals)) {
                    day.meals.sort((a, b) => {
                        const orderA = mealOrder[a.type] || 99;
                        const orderB = mealOrder[b.type] || 99;
                        return orderA - orderB;
                    });
                }
            });

            const existingStartObj = new Date(existingPlan.startDate);
            const newStartObj = new Date(startStr);
            finalStartStr = existingStartObj < newStartObj ? existingPlan.startDate : startStr;

            const existingEndObj = new Date(existingPlan.endDate);
            const newEndObj = new Date(endStr);
            finalEndStr = existingEndObj > newEndObj ? existingPlan.endDate : endStr;

            const mergedFridges = new Set([...(existingPlan.targetFridges || []), ...finalFridges]);
            finalFridges = Array.from(mergedFridges);
        }

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
                const fetchedItems = await fetchFridgeItems(args.listId);
                console.log(`\n=== DEBUG: FRIDGE ITEMS FOR LIST ${args.listId} ===`);
                console.log(JSON.stringify(fetchedItems, null, 2));
                console.log(`========================================================\n`);
                return { success: true, items: fetchedItems };
            case 'create_meal_plan':
                return await processMealPlanTool(args);
            default:
                return { success: false, error: `Tool ${fnName} not recognized.` };
        }
    };

    // ==========================================
    // MAIN CHAT LOGIC (API CALLS)
    // ==========================================
    const sendMessage = async (presetText, isSystemPrompt = false, hiddenApiText = null) => {
        const userMsgText = typeof presetText === 'string' ? presetText : inputText;
        if (userMsgText.trim().length === 0) return;

        if (!isSystemPrompt) {
            const lowerText = userMsgText.toLowerCase();
            const isMealPlanRequest = /(create|make|generate|build|new|plan|want|need).*meal plan/i.test(lowerText) || lowerText.includes('meal plan for');

            if (isMealPlanRequest) {
                setShowMealForm(true);
                setInputText('');
                return;
            }
        }

        const currentHistory = [...messages, { id: Date.now().toString(), text: userMsgText, sender: 'user' }];
        setMessages(currentHistory);
        setInputText('');
        setIsLoading(true);

        const textToSendToAI = hiddenApiText ? hiddenApiText : userMsgText;

        try {
            let isConversationDone = false;
            let currentIntermediateSteps = [];

            while (!isConversationDone) {
                const requestBody = {
                    message: textToSendToAI,
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
                    const toolResultData = await executeLocalTool(fn.name, fn.args || {});

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
            <Text style={styles.welcomeTitle}>How can I help you today?</Text>
            <View style={styles.suggestionsGrid}>
                
                {/* Box 1: Create a meal plan */}
                <View style={styles.suggestionWrapper}>
                    <TouchableOpacity style={styles.suggestionButton} onPress={() => setShowMealForm(true)}>
                        <Image 
                            source={require('@/assets/images/ai/MealPlanBox.png')} 
                            style={styles.suggestionImage} 
                            resizeMode="contain" 
                        />
                    </TouchableOpacity>
                    <Text style={styles.suggestionText}>Create a meal plan</Text>
                </View>
                
                {/* Box 2: Add to grocery list */}
                <View style={styles.suggestionWrapper}>
                    <TouchableOpacity style={styles.suggestionButton} onPress={() => sendMessage("I need to add some items to my grocery list.")}>
                        <Image 
                            source={require('@/assets/images/ai/GroceryItemBox.png')} 
                            style={styles.suggestionImage} 
                            resizeMode="contain" 
                        />
                    </TouchableOpacity>
                    <Text style={styles.suggestionText}>Add to grocery list</Text>
                </View>
                
                {/* Box 3: Cook from my fridge */}
                <View style={styles.suggestionWrapper}>
                    <TouchableOpacity style={styles.suggestionButton} onPress={() => setShowFridgeForm(true)}>
                        <Image 
                            source={require('@/assets/images/ai/CookFromFridgeBox.png')} 
                            style={styles.suggestionImage} 
                            resizeMode="contain" 
                        />
                    </TouchableOpacity>
                    <Text style={styles.suggestionText}>Cook from my fridge</Text>
                </View>
                
                {/* Box 4: Suggest a recipe */}
                <View style={styles.suggestionWrapper}>
                    <TouchableOpacity style={styles.suggestionButton} onPress={() => sendMessage("Can you suggest me a recipe?")}>
                        <Image 
                            source={require('@/assets/images/ai/RecipeBox.png')}
                            style={styles.suggestionImage} 
                            resizeMode="contain" 
                        />
                    </TouchableOpacity>
                    <Text style={styles.suggestionText}>Suggest a recipe</Text>
                </View>

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
                    <View style={[styles.modalCard, { maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Plan Details</Text>
                            <Ionicons name="close" size={26} color="#333" onPress={() => setShowMealForm(false)} />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <Text style={styles.inputLabel}>Plan Name (Optional)</Text>
                            <TextInput 
                                style={styles.modalInput} 
                                placeholder="e.g., Gym Week, AI Trail" 
                                value={formName} 
                                onChangeText={setFormName} 
                                placeholderTextColor="#A0A0A0" 
                            />

                            <Text style={styles.inputLabel}>List Color</Text>
                            <View style={styles.colorContainer}>
                                {COLORS.map(color => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.colorCircle, 
                                            { backgroundColor: color }, 
                                            formColor === color && styles.colorCircleActive
                                        ]}
                                        onPress={() => setFormColor(color)}
                                    />
                                ))}
                            </View>

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

                            <Text style={styles.inputLabel}>Duration (Days)</Text>
                            <View style={styles.pillContainer}>
                                {[1, 2, 3, 5, 7].map(day => (
                                    <TouchableOpacity 
                                        key={day} 
                                        style={[styles.pill, formDays === day && styles.pillActive]} 
                                        onPress={() => setFormDays(day)}
                                    >
                                        <Text style={[styles.pillText, formDays === day && styles.pillTextActive]}>{day}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Add Groceries To Which Fridge</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 5 }}>
                                <TouchableOpacity 
                                    style={[styles.pill, formTargetFridge === 'ALL' && styles.pillActive]} 
                                    onPress={() => setFormTargetFridge('ALL')}
                                >
                                    <Text style={[styles.pillText, formTargetFridge === 'ALL' && styles.pillTextActive]}>All</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.pill, formTargetFridge === 'CREATE_NEW' && styles.pillActive]} 
                                    onPress={() => setFormTargetFridge('CREATE_NEW')}
                                >
                                    <Text style={[styles.pillText, formTargetFridge === 'CREATE_NEW' && styles.pillTextActive]}>Current List</Text>
                                </TouchableOpacity>
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

                            <View style={styles.mealsHeaderContainer}>
                                <Text style={styles.inputLabel}>Meals Included</Text>
                                <TouchableOpacity onPress={() => setIsAdvancedMeals(!isAdvancedMeals)}>
                                    <Text style={styles.advancedText}>{isAdvancedMeals ? 'Basic' : 'Advanced'}</Text>
                                </TouchableOpacity>
                            </View>

                            {!isAdvancedMeals ? (
                                <View style={styles.pillContainer}>
                                    {['breakfast', 'lunch', 'dinner'].map(meal => {
                                        const isActive = formMeals[meal];
                                        return (
                                            <TouchableOpacity 
                                                key={meal} 
                                                style={[styles.pill, isActive && styles.pillActive]} 
                                                onPress={() => setFormMeals(prev => ({ ...prev, [meal]: !isActive }))}
                                            >
                                                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                                                    {meal.charAt(0).toUpperCase() + meal.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={styles.advancedMealsContainer}>
                                    {Array.from({ length: formDays }).map((_, dayIndex) => (
                                        <View key={dayIndex} style={styles.advancedDayRow}>
                                            <Text style={styles.advancedDayText}>Day {dayIndex + 1}</Text>
                                            <View style={styles.pillContainerSmall}>
                                                {['breakfast', 'lunch', 'dinner'].map(meal => {
                                                    const isActive = advancedMeals[dayIndex][meal];
                                                    return (
                                                        <TouchableOpacity 
                                                            key={meal} 
                                                            style={[styles.pillSmall, isActive && styles.pillActive]} 
                                                            onPress={() => toggleAdvancedMeal(dayIndex, meal)}
                                                        >
                                                            <Text style={[styles.pillTextSmall, isActive && styles.pillTextActive]}>
                                                                {meal.charAt(0).toUpperCase() + meal.slice(1)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <Text style={styles.inputLabel}>Allergies / Restrictions</Text>
                            <TextInput 
                                style={styles.modalInput} 
                                placeholder="e.g., Peanuts, Vegan, None" 
                                value={formAllergies} 
                                onChangeText={setFormAllergies} 
                                placeholderTextColor="#A0A0A0" 
                            />

                            <TouchableOpacity style={styles.submitFormButton} onPress={submitMealPlanForm}>
                                <Text style={styles.submitFormText}>Generate Plan</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        );
    };

    const renderFridgeCookModal = () => {
        return (
            <Modal visible={showFridgeForm} transparent animationType="fade">
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Fridge</Text>
                            <Ionicons name="close" size={26} color="#333" onPress={() => setShowFridgeForm(false)} />
                        </View>

                        <Text style={styles.inputLabel}>Which list should I look in?</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
                            <TouchableOpacity
                                style={[styles.pill, cookTargetFridge === 'ALL' && styles.pillActive]}
                                onPress={() => setCookTargetFridge('ALL')}
                            >
                                <Text style={[styles.pillText, cookTargetFridge === 'ALL' && styles.pillTextActive]}>All Lists</Text>
                            </TouchableOpacity>

                            {userLists.map(list => {
                                const listId = list.listId || list.id || list._id;
                                const listName = list.listName || list.name || "Unnamed List";
                                const isActive = cookTargetFridge === listId;
                                return (
                                    <TouchableOpacity
                                        key={listId}
                                        style={[styles.pill, isActive && styles.pillActive]}
                                        onPress={() => setCookTargetFridge(listId)}
                                    >
                                        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{listName}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity style={styles.submitFormButton} onPress={submitFridgeCookRequest}>
                            <Text style={styles.submitFormText}>Find Recipes</Text>
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
        <ImageBackground
            source={require('@/assets/images/ai/AI_BG.png')}
            style={styles.background} 
            resizeMode="stretch"
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <ImageBackground
                    source={require('@/assets/images/freshness/SelectorPanel.png')}
                    style={styles.header}
                    resizeMode="stretch"
                >
                    <View style={styles.headerWrapper}>
                        <Image
                            source={require('@/assets/images/ai/Paper.png')}
                            style={styles.headerPaper}
                            resizeMode='stretch'
                        />
                    </View>
                    
                    <TouchableOpacity
                        style={styles.headerIcon}
                        onPress={() => router.back()}
                    >
                        <Image
                            source={require('@/components/images/BackButton.png')}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode='contain'
                        />
                    </TouchableOpacity>
                    
                    <Text style={styles.headerTitle}>AI Assistant</Text>
                    
                    <TouchableOpacity style={styles.headerIcon} onPress={clearHistory}>
                        <Image
                            source={require('@/components/images/RefreshButton.png')}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode='contain'
                        />
                    </TouchableOpacity>
                </ImageBackground>

                {/* Chat Content */}
                <KeyboardAvoidingView 
                    style={{ flex: 1 }} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                >
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
                    <View style={styles.inputWrapper}>
                        <ImageBackground
                            source={require('@/assets/images/ai/TextInput.png')}
                            style={styles.inputContainer}
                            resizeMode="stretch"
                        >
                            <TextInput
                                style={styles.input}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Ask AI for Help!"
                                multiline={true}
                                placeholderTextColor="#888"
                                onFocus={() => {
                                    setTimeout(() => {
                                        flatListRef.current?.scrollToEnd({ animated: true });
                                    }, 200);
                                }}
                            />
                        </ImageBackground>

                        <TouchableOpacity onPress={sendMessage} disabled={isLoading}>
                            <ImageBackground
                                source={require('@/components/images/GeneralRedButton.png')}
                                style={styles.sendButton}
                                resizeMode='stretch' 
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.sendButtonText}>Send</Text>
                                )}
                            </ImageBackground>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

                {/* Overlays */}
                {renderMealPlanModal()}
                {renderFridgeCookModal()}

            </SafeAreaView>
        </ImageBackground>
    );
}

// ==========================================
// STYLES
// ==========================================
const { width, height } = Dimensions.get('window');
const isTabletView = width > 710;

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerWrapper: {
        position: 'absolute',
        top: 8,    
        bottom: 8, 
        left: 12,
        right: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerPaper: {
        width: '100%',
        height: '100%'
    },
    headerIcon: {
        height: isTabletView ? 60 : 40,
        aspectRatio: 1,

        shadowColor: "#4A3525",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 0,
        elevation: 3,
    },
    headerTitle: {
        fontSize: isTabletView ? 24 : 18,
        fontFamily: 'PixelFont',
        color: '#333',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    welcomeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    welcomeTitle: {
        fontSize: isTabletView ? 28 : 24,
        fontFamily: 'PixelFont',
        color: '#333',
        marginBottom: 30,
        textAlign: 'center',
    },
    suggestionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '80%',
    },
    suggestionWrapper: {
        width: '46%', 
        alignItems: 'center', 
        marginBottom: 20,
    },
    suggestionButton: {
        width: '100%',
        aspectRatio: 1, 

        shadowColor: "#4A3525",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    suggestionImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    suggestionText: {
        marginTop: 8,
        fontSize: isTabletView ? 18 : 15,
        fontFamily: "PixelFont",
        color: '#444',
        textAlign: 'center',
        lineHeight: 20,
    },
    listContent: {
        padding: 16,
        paddingBottom: 30,
    },
    messageBubble: {
        maxWidth: '90%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#C86842',
        borderRadius: 8,
        borderBottomRightRadius: 0, 
        borderWidth: 2,
        borderColor: '#A0492B',
        
        shadowColor: "#000000",
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 0, 
        elevation: 3,
    },
    botBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#E6D5B3', 
        borderRadius: 8,
        borderBottomLeftRadius: 0,
        borderWidth: 4,
        borderColor: '#6D4C3D', 

        shadowColor: "#4A3525",
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0, 
        elevation: 10,
    },
    messageText: {
        fontSize: 12,
        fontFamily: 'PixelFont',
        lineHeight: 16
    },
    userText: {
        color: '#FFFFFF',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        width: '100%',
    },
    inputContainer: {
        flex: 1,
        minHeight: 60, 
        justifyContent: 'center',
        marginRight: 10, 
        paddingLeft: '5%',   
        paddingRight: '4%',  
        paddingTop: 14,   
        paddingBottom: 14,
    },
    input: {
        paddingHorizontal: 16,
        fontSize: isTabletView ? 16 : 12,
        fontFamily: 'PixelFont',
        color: '#5C4033',   
        minHeight: 24,           
        maxHeight: 100,   
        includeFontPadding: false,
        textAlignVertical: 'center'         
    },
    sendButton: {
        width: isTabletView ? 100 : 80,  
        height: isTabletView ? 60 : 45, 
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        paddingHorizontal: 5
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 16 : 14,
        includeFontPadding: false,
        textAlignVertical: 'center'
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
        marginTop: 20,
    },
    modalInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    pillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    pill: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#F0F0F0',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    pillActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    pillText: {
        fontSize: 14,
        color: '#555',
        fontWeight: '600',
    },
    pillTextActive: {
        color: '#FFFFFF',
    },
    submitFormButton: {
        backgroundColor: '#007AFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginTop: 30,
    },
    submitFormText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    colorContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 5,
    },
    colorCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorCircleActive: {
        borderColor: '#007AFF',
    },

    mealsHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    advancedText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    advancedMealsContainer: {
        gap: 8,
    },
    advancedDayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9F9F9',
        padding: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    advancedDayText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
    },
    pillContainerSmall: {
        flexDirection: 'row',
        gap: 6,
    },
    pillSmall: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#E0E0E0',
        borderRadius: 16,
    },
    pillTextSmall: {
        fontSize: 12,
        color: '#555',
        fontWeight: '600',
    },
});

const botMarkdownStyles = {
    body: {
        fontSize: 12,
        fontFamily: 'PixelFont',
        color: '#623d23ff',
        lineHeight: 24,
    },
    text: {
        fontFamily: 'PixelFont'
    },
    paragraph: {
        marginTop: 0,
        marginBottom: 10,
    },
    strong: {
        fontFamily: 'PixelFont', 
        fontSize: 13,
        fontWeight: 'normal',
        color: 'black', // Slightly darker for emphasis
    },
    bullet_list: {
        marginBottom: 10,
    },
    table: {
        borderWidth: 2,
        borderColor: '#8B6A4F',
        borderRadius: 4,
        marginTop: 5,
        marginBottom: 10,
    },
    th: {
        backgroundColor: '#D4BA8C', // Darker parchment for headers
        padding: 8,
        fontWeight: 'bold',
        textAlign: 'left',
    },
    tr: {
        borderBottomWidth: 2,
        borderColor: '#C7A87A',
    },
    td: {
        padding: 8,
    },
};