import VoiceInputModal from '@/components/VoiceInputModal';
import {
    addListItems,
    batchAddListItems,
    createNewList,
    createUserPlan,
    fetchFridgeItems,
    fetchGroceryCatalog,
    fetchRecipes,
    fetchUserLists,
    fetchUserMealPlan,
    updateUserPlan
} from '@/services/api.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
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

// --- Backend URL ---
const SERVER_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

console.log(SERVER_URL)

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

    // Voice State
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [activeInputContext, setActiveInputContext] = useState('CHAT');

    // Meal Plan Form State
    const [showMealForm, setShowMealForm] = useState(false);
    const [formName, setFormName] = useState('');
    const [formDays, setFormDays] = useState(3);
    const [formMeals, setFormMeals] = useState({ breakfast: true, lunch: true, dinner: true });
    const [formAllergies, setFormAllergies] = useState('');
    const [formStartDate, setFormStartDate] = useState(new Date());
    const [formTargetFridge, setFormTargetFridge] = useState('ALL');

    // Fridge Cook Form State
    const [showFridgeForm, setShowFridgeForm] = useState(false);
    const [cookTargetFridge, setCookTargetFridge] = useState('ALL');

    // Add to List Form State
    const [showAddToListForm, setShowAddToListForm] = useState(false);
    const [addToListTarget, setAddToListTarget] = useState('CREATE_NEW');
    const [addToListName, setAddToListName] = useState('');
    const [addToListItemsText, setAddToListItemsText] = useState('');

    const COLORS = ['#FFF9C4', '#E1F5FE', '#FFEBEE', '#E8F5E9', '#F3E5F5'];
    const [formColor, setFormColor] = useState(COLORS[3]);

    const [isAdvancedMeals, setIsAdvancedMeals] = useState(false);
    const [advancedMeals, setAdvancedMeals] = useState(
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
                    const parsedLists = Array.isArray(lists) ? lists : (lists.data || lists.lists || []);
                    setUserLists(parsedLists);
                    // Default the add to list target to the first available list, or CREATE_NEW if none
                    if (parsedLists.length > 0) {
                        setAddToListTarget(parsedLists[0].listId || parsedLists[0].id || parsedLists[0]._id);
                    }
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
    // VOICE HANDLER
    // ==========================================
    const handleVoiceComplete = (transcribedText) => {
        setShowVoiceModal(false);

        if (activeInputContext === 'ADD_TO_LIST') {
            setTimeout(() => setShowAddToListForm(true), 300);
        }

        if (transcribedText.trim().length > 0) {
            if (activeInputContext === 'CHAT') {
                setInputText((prev) => (prev + " " + transcribedText).trim());
            } else if (activeInputContext === 'ADD_TO_LIST') {
                setAddToListItemsText((prev) => (prev + " " + transcribedText).trim());
            }
        }
    };

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
    //  LOGIC
    // ==========================================

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

        const displayText = `Please create a ${formDays}-day meal plan named "${finalName}".`;
        const engineeredPrompt = `Please create a ${formDays}-day meal plan for me starting on ${formStartDate.toDateString()}.\n• Name: "${finalName}"\n• Meals included: ${mealsPromptText}\n• Allergies or restrictions: ${finalAllergies}\n\nPlease generate this using recipes from the catalog and save it!`;

        sendMessage(displayText, true, engineeredPrompt);

        setFormName('');
        setFormDays(3);
        setFormMeals({ breakfast: true, lunch: true, dinner: true });
        setFormAllergies('');
        setFormStartDate(new Date());
        setFormTargetFridge('ALL');
        setFormColor(COLORS[3]);
    };

    const submitFridgeCookRequest = () => {
        setShowFridgeForm(false);

        const selectedList = cookTargetFridge !== 'ALL'
            ? userLists.find(list => (list.listId || list.id || list._id) === cookTargetFridge)
            : null;

        const listName = selectedList ? (selectedList.listName || selectedList.name) : "All Lists";

        const displayText = cookTargetFridge === 'ALL'
            ? "What can I make with the ingredients in my fridge?"
            : `What can I make with the ingredients in "${listName}"?`;

        let hiddenPrompt = "I want to cook from my fridge. Please check ALL of my grocery lists. DO NOT ask me which list to choose. Use your tools to pick a list, check it silently, and immediately suggest exactly ONE recipe I can make right now. Do not format this as a daily meal plan.";

        if (cookTargetFridge !== 'ALL') {
            hiddenPrompt = `I want to cook from my fridge. You MUST immediately call the 'get_fridge_items' tool specifically for the list named "${listName}" (ID: ${cookTargetFridge}). Read the items carefully. Even if there are only 1 or 2 random ingredients, DO NOT say the list is empty. Invent exactly ONE creative recipe I can make with whatever is there. Do not format this as a daily meal plan.`;
        }

        sendMessage(displayText, true, hiddenPrompt);
        setCookTargetFridge('ALL');
    };

    const submitAddToListForm = () => {
        setShowAddToListForm(false);
        if (!addToListItemsText.trim()) return;

        let hiddenPrompt = "";
        let displayText = "";

        if (addToListTarget === 'CREATE_NEW') {
            const newName = addToListName.trim() || 'New Grocery List';
            displayText = `Please create a new list called "${newName}" and add: ${addToListItemsText}`;
            
            // --- Explicitly script the 2-Turn workflow for the AI ---
            hiddenPrompt = `SYSTEM COMMAND: You are executing a mandatory 2-step sequence to add items.
                            STEP 1: Call 'create_new_list' (listName: "${newName}") and 'fetch_grocery_catalog' right now in parallel. Do not output text.
                            STEP 2: When I return the tool results (which will contain the new listId), you MUST immediately call 'add_multiple_list_items' or 'add_single_list_item' to add these items: ${addToListItemsText}.
                            CRITICAL: NEVER reply with text saying you added the items until you have ACTUALLY fired the 'add_multiple_list_items' or 'add_single_list_item' tool.`;
        } else {
            const selectedList = userLists.find(list => (list.listId || list.id || list._id) === addToListTarget);
            const listName = selectedList ? (selectedList.listName || selectedList.name) : "My List";

            displayText = `Add these to "${listName}": ${addToListItemsText}`;
            
            // --- Force immediate tool execution ---
            hiddenPrompt = `SYSTEM COMMAND: I want to add items to my existing list named "${listName}" (ID: ${addToListTarget}). Here are the items: ${addToListItemsText}. You must immediately call 'fetch_grocery_catalog' right now to categorize them. Do not reply with text first.`;
        }

        sendMessage(displayText, true, hiddenPrompt);

        setAddToListItemsText('');
        setAddToListName('');
    };

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
                try {
                    const newListResult = await createNewList(currentUserId, args.listName, args.color || '#FFF9C4');

                    let extractedId = null;

                    if (newListResult?.listId) extractedId = newListResult.listId;
                    else if (newListResult?.data?.listId) extractedId = newListResult.data.listId;
                    else if (newListResult?.id) extractedId = newListResult.id;
                    else if (newListResult?.data?.id) extractedId = newListResult.data.id;

                    if (extractedId) {
                        setAddToListTarget(extractedId);
                        console.log("Successfully intercepted new list ID:", extractedId);

                        return {
                            success: true,
                            listId: extractedId,
                            message: `List created. The listId is ${extractedId}`
                        };
                    } else {
                        console.warn("Could not find listId in response:", newListResult);
                        return { success: false, error: "Created list but failed to parse ID." };
                    }
                } catch (e) {
                    console.error("Create list tool error:", e);
                    return { success: false, error: e.message };
                }
            case 'fetch_grocery_catalog':
                return { success: true, catalog: await fetchGroceryCatalog() };
            case 'add_single_list_item':
                const singleTargetId = args.listId || addToListTarget;

                if (!singleTargetId || singleTargetId === 'CREATE_NEW') {
                    return { success: false, error: "Invalid target list ID." };
                }

                const singleListObj = userLists.find(l => (l.listId || l.id || l._id) === singleTargetId) || {};

                return { 
                    success: true, 
                    targetId: singleTargetId,
                    title: singleListObj.listName || singleListObj.name || addToListName || "My List",
                    color: singleListObj.color || formColor || '#FFF9C4',
                    userRole: singleListObj.role || 'owner',
                    data: await addListItems(singleTargetId, args.item, args.quantity || "1", args.category || "Uncategorized", args.shelfLife || null),
                    SYSTEM_DIRECTIVE: "ACTION SUCCESSFUL. YOU MUST STOP CALLING TOOLS NOW. REPLY TO THE USER WITH A TEXT SUMMARY."
                };
            case 'add_multiple_list_items':
                const batchTargetId = args.listId || addToListTarget;

                if (!batchTargetId || batchTargetId === 'CREATE_NEW') {
                    return { success: false, error: "Invalid target list ID." };
                }

                const batchListObj = userLists.find(l => (l.listId || l.id || l._id) === batchTargetId) || {};

                return { 
                    success: true, 
                    targetId: batchTargetId,
                    title: batchListObj.listName || batchListObj.name || addToListName || "My List",
                    color: batchListObj.color || formColor || '#FFF9C4',
                    userRole: batchListObj.role || 'owner',
                    data: await batchAddListItems(batchTargetId, args.items),
                    SYSTEM_DIRECTIVE: "ACTION SUCCESSFUL. YOU MUST STOP CALLING TOOLS NOW. REPLY TO THE USER WITH A TEXT SUMMARY."
                };
            case 'get_recipes':
                return { success: true, catalog: await fetchRecipes(args.mealType) };
            case 'get_fridge_items':
                const fetchedItems = await fetchFridgeItems(args.listId);
                console.log(`\n=== DEBUG: FRIDGE ITEMS FOR LIST ${args.listId} ===`);
                console.log(JSON.stringify(fetchedItems, null, 2));
                console.log(`========================================================\n`);
                return { success: true, items: fetchedItems };
            case 'create_meal_plan':
                const planResult = await processMealPlanTool(args);
                return {
                    ...planResult,
                    SYSTEM_DIRECTIVE: "ACTION SUCCESSFUL. YOU MUST STOP CALLING TOOLS NOW. REPLY TO THE USER WITH A TEXT SUMMARY."
                };
            default:
                return { success: false, error: `Tool ${fnName} not recognized.` };
        }
    };

    const sendMessage = async (presetText, isSystemPrompt = false, hiddenApiText = null) => {
        const userMsgText = typeof presetText === 'string' ? presetText : inputText;
        if (userMsgText.trim().length === 0) return;

        if (!isSystemPrompt) {
            const lowerText = userMsgText.toLowerCase();
            if (/(create|make|generate|build|new|plan|want|need).*meal plan/i.test(lowerText) || lowerText.includes('meal plan for')) {
                setShowMealForm(true);
                setInputText('');
                return;
            }
            if (/(add|put|insert|need).*grocery list/i.test(lowerText) || lowerText.includes('add to list')) {
                setShowAddToListForm(true);
                setAddToListItemsText(userMsgText);
                setInputText('');
                return;
            }
        }

        const currentHistory = [...messages, { id: Date.now().toString(), text: userMsgText, sender: 'user' }];
        setMessages(currentHistory);
        setInputText('');
        setIsLoading(true);

        let textToSendToAI = hiddenApiText ? hiddenApiText : userMsgText;

        try {
            let isConversationDone = false;
            let currentIntermediateSteps = [];

            const impliesCooking = /(meal plan|recipe|cook|make|dinner|lunch|breakfast)/i.test(userMsgText.toLowerCase()) || hiddenApiText !== null;
            const recipesToSend = impliesCooking ? availableRecipes : [];

            while (!isConversationDone) {
                const requestBody = { 
                    message: textToSendToAI, 
                    history: currentHistory, 
                    recipes: recipesToSend, 
                    intermediateSteps: currentIntermediateSteps 
                };
                const response = await fetch(SERVER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
                const data = await response.json();

                if (data.action === 'tool_call') {
                    const modelParts = data.allParts || (data.originalPart ? [data.originalPart] : []);
                    const functionParts = [];

                    let actionTaken = false;

                    for (const part of modelParts) {
                        if (part.functionCall) {
                            const fn = part.functionCall;
                            const result = await executeLocalTool(fn.name, fn.args || {});
                            
                            if (['add_single_list_item', 'add_multiple_list_items', 'create_meal_plan'].includes(fn.name)) {
                                if (result.success) actionTaken = true;
                            }

                            const sanitizedResult = JSON.parse(JSON.stringify(result || { status: "success" }));
                            functionParts.push({
                                functionResponse: { name: fn.name, response: sanitizedResult }
                            });
                        }
                    }

                    currentIntermediateSteps.push({
                        modelParts: modelParts,
                        functionParts: functionParts
                    });

                    if (actionTaken) {
                        textToSendToAI = "Success! The items have been added/plan has been saved. Please stop calling tools and just give me a final confirmation message now.";
                    }
                } else if (data.action === 'reply') {
                    const cleanReply = data.reply ? data.reply.replace(/\\/g, '') : "";
                    
                    const createdMealPlan = currentIntermediateSteps.some(step => 
                        step.functionParts && step.functionParts.some(fp => 
                            fp.functionResponse?.name === 'create_meal_plan' && 
                            fp.functionResponse?.response?.success === true
                        )
                    );
                    
                    let addedToListData = null;
                    
                    for (const step of currentIntermediateSteps) {
                        if (!step.functionParts) continue;

                        const addTargetCall = step.functionParts.find(fp => 
                            ['add_single_list_item', 'add_multiple_list_items'].includes(fp.functionResponse?.name) && 
                            fp.functionResponse?.response?.success === true
                        );

                        if (addTargetCall) {
                            const res = addTargetCall.functionResponse.response;
                            addedToListData = {
                                listId: res.targetId,
                                title: res.title,
                                color: res.color,
                                userRole: res.userRole
                            };
                            break; 
                        }
                    }

                    setMessages(prev => [...prev, { 
                        id: Date.now().toString(), 
                        text: cleanReply, 
                        sender: 'bot', 
                        showMealPlanButton: createdMealPlan,
                        addedToListData: addedToListData 
                    }]);
                    
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
        <ScrollView
            contentContainerStyle={styles.welcomeContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
        >
            <Text style={styles.welcomeTitle}>How can I help you today?</Text>
            <View style={styles.suggestionsGrid}>
                {/* Box 1 */}
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

                {/* Box 2 */}
                <View style={styles.suggestionWrapper}>
                    <TouchableOpacity style={styles.suggestionButton} onPress={() => setShowAddToListForm(true)}>
                        <Image source={require('@/assets/images/ai/GroceryItemBox.png')} style={styles.suggestionImage} resizeMode="contain" />
                    </TouchableOpacity>
                    <Text style={styles.suggestionText}>Add to grocery list</Text>
                </View>

                {/* Box 3 */}
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

                {/* Box 4 */}
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
        </ScrollView>
    );

    const renderItem = ({ item }) => (
        <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
            {item.sender === 'user' ? (
                <Text style={[styles.messageText, styles.userText]}>{item.text}</Text>
            ) : (
                <View>
                    <Markdown style={botMarkdownStyles}>{item.text}</Markdown>

                    {/* View Meal Plan Button */}
                    {item.showMealPlanButton && (
                        <TouchableOpacity
                            style={styles.actionButtonWrapper}
                            onPress={() => router.push('./(meal_plan)')}
                        >
                            <ImageBackground
                                source={require('@/components/images/GeneralBlueButton.png')}
                                style={styles.actionButtonBg}
                                resizeMode="stretch"
                            >
                                <Text style={styles.actionButtonText}>View Meal Plan</Text>
                            </ImageBackground>
                        </TouchableOpacity>
                    )}

                    {/* View List Button */}
                    {item.addedToListData && (
                        <TouchableOpacity
                            style={styles.actionButtonWrapper}
                            onPress={() => router.push({
                                pathname: './detail_list',
                                params: {
                                    listId: item.addedToListData.listId,
                                    title: item.addedToListData.title,
                                    userRole: item.addedToListData.userRole,
                                    color: item.addedToListData.color
                                }
                            })}
                        >
                            <ImageBackground source={require('@/components/images/GeneralBlueButton.png')} style={styles.actionButtonBg} resizeMode="stretch">
                                <Text style={styles.actionButtonText}>View List</Text>
                            </ImageBackground>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );

    const renderFooter = () => {
        if (!isLoading) return null;

        return (
            <View style={[
                styles.messageBubble,
                styles.botBubble,
                { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 18 }
            ]}>
                <TypingIndicator />
            </View>
        );
    };

    // Button Helper Function for Text Wrapping
    const formatButtonText = (text) => {
        // If it's short, or a single giant word with no spaces, leave it alone
        if (text.length <= 12 || !text.includes(' ')) return text;

        const words = text.split(' ');
        const middle = Math.floor(text.length / 2);

        let line1 = "";
        let line2 = "";

        for (let word of words) {
            // Fill line 1 until we hit the middle of the string
            if (line1.length < middle) {
                line1 += (line1.length > 0 ? " " : "") + word;
            } else {
                line2 += (line2.length > 0 ? " " : "") + word;
            }
        }
        // Return with a physical line break
        return line2 ? `${line1}\n${line2}` : line1;
    };

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

    const renderAddToListModal = () => {
        return (
            <Modal visible={showAddToListForm} transparent animationType="fade">
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <ImageBackground source={require('@/assets/images/listing/icons/ItemBorder.png')} style={[styles.modalCard]} resizeMode='stretch'>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add to List</Text>
                            <TouchableOpacity onPress={() => setShowAddToListForm(false)} style={styles.headerIcon}>
                                <Image source={require('@/components/images/ExitButton.png')} style={{ height: '80%', aspectRatio: 1 }} resizeMode='contain' />
                            </TouchableOpacity>
                        </View>
                        <Image source={require('@/components/images/Separator.png')} style={{ width: '100%' }} resizeMode='stretch' />

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <Text style={styles.inputLabel}>Which List?</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: isTabletView ? 120 : 100, flexGrow: 0 }} contentContainerStyle={{ gap: 10, paddingVertical: 5, alignItems: 'center' }}>
                                <TouchableOpacity style={[styles.pillWrapper, { width: 'auto', minWidth: isTabletView ? 120 : 90, height: isTabletView ? 60 : 50, justifyContent: 'center', alignItems: 'center' }]} onPress={() => setAddToListTarget('CREATE_NEW')}>
                                    <ImageBackground source={addToListTarget === 'CREATE_NEW' ? require('@/components/images/GeneralBlueButton.png') : require('@/components/images/GeneralWoodenButton.png')} style={[styles.pillImageBackground, { width: 'auto', paddingHorizontal: isTabletView ? 24 : 16 }]} resizeMode="stretch">
                                        <Text style={[styles.pillText, addToListTarget === 'CREATE_NEW' && styles.pillTextActive]}>Create New List</Text>
                                    </ImageBackground>
                                </TouchableOpacity>

                                {userLists.map(list => {
                                    const listId = list.listId || list.id || list._id;
                                    const isActive = addToListTarget === listId;
                                    const displayListText = formatButtonText(list.listName || list.name || "Unnamed List");
                                    return (
                                        <TouchableOpacity key={listId} style={[styles.pillWrapper, { width: 'auto', minWidth: isTabletView ? 120 : 90, height: isTabletView ? 60 : 50, justifyContent: 'center', alignItems: 'center' }]} onPress={() => setAddToListTarget(listId)}>
                                            <ImageBackground source={isActive ? require('@/components/images/GeneralBlueButton.png') : require('@/components/images/GeneralWoodenButton.png')} style={[styles.pillImageBackground, { width: 'auto', paddingHorizontal: isTabletView ? 24 : 16 }]} resizeMode="stretch">
                                                <Text numberOfLines={2} style={[styles.pillText, isActive && styles.pillTextActive, { textAlign: 'center', lineHeight: isTabletView ? 16 : 14 }]}>{displayListText}</Text>
                                            </ImageBackground>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {addToListTarget === 'CREATE_NEW' && (
                                <>
                                    <Text style={styles.inputLabel}>New List Name (Optional)</Text>
                                    <ImageBackground source={require('@/assets/images/listing/DescriptionBG.png')} style={styles.modalInputContainer} resizeMode="stretch">
                                        <TextInput style={styles.modalInput} placeholder="e.g., Weekend BBQ" value={addToListName} onChangeText={setAddToListName} placeholderTextColor="#A0A0A0" />
                                    </ImageBackground>
                                </>
                            )}

                            <Text style={styles.inputLabel}>Items (Type or use voice)</Text>
                            <ImageBackground source={require('@/assets/images/listing/DescriptionBG.png')} style={[styles.modalInputContainer, { flexDirection: 'row', alignItems: 'center', paddingRight: 10, minHeight: 80 }]} resizeMode="stretch">
                                <TextInput
                                    style={[styles.modalInput, { flex: 1 }]}
                                    value={addToListItemsText}
                                    onChangeText={setAddToListItemsText}
                                    placeholder="e.g., Bread, Milk"
                                    placeholderTextColor="#A0A0A0"
                                    multiline={true}
                                />
                                <TouchableOpacity
                                    onPress={() => {
                                        setActiveInputContext('ADD_TO_LIST');
                                        setShowAddToListForm(false);
                                        setTimeout(() => setShowVoiceModal(true), 300);
                                    }}
                                    style={styles.micIconWrapper}
                                >
                                    <Image source={require('@/components/images/MicOff.png')} style={styles.micIcon} resizeMode="contain" />
                                </TouchableOpacity>
                            </ImageBackground>

                            <TouchableOpacity style={styles.submitFormButtonWrapper} onPress={submitAddToListForm}>
                                <ImageBackground source={require("@/assets/images/listing/TitlePanel.png")} style={styles.submitFormButton} resizeMode='stretch'>
                                    <Text style={styles.submitFormText}>Add Items</Text>
                                </ImageBackground>
                            </TouchableOpacity>

                        </ScrollView>
                    </ImageBackground>
                </KeyboardAvoidingView>
            </Modal>
        );
    };

    const renderMealPlanModal = () => {
        const dateOptions = generateDateOptions();

        return (
            <Modal visible={showMealForm} transparent animationType="fade">
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <ImageBackground
                        source={require('@/assets/images/listing/icons/ItemBorder.png')}
                        style={[styles.modalCard]}
                        resizeMode='stretch'
                    >
                        <View style={styles.modalHeader}>

                            <Text style={styles.modalTitle}>Plan Details</Text>

                            <TouchableOpacity
                                style={[styles.headerIcon, { alignContent: 'center', justifyContent: 'center' }]}
                                onPress={() => setShowMealForm(false)}
                            >
                                <Image
                                    source={require('@/components/images/ExitButton.png')}
                                    style={{ height: '80%', aspectRatio: 1 }}
                                    resizeMode='contain'
                                />
                            </TouchableOpacity>

                        </View>

                        <Image
                            source={require('@/components/images/Separator.png')}
                            style={{
                                width: '100%'
                            }}
                            resizeMode='stretch'
                        />

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <Text style={styles.inputLabel}>Plan Name (Optional)</Text>

                            <ImageBackground
                                source={require('@/assets/images/listing/DescriptionBG.png')}
                                style={[styles.modalInputContainer]}
                                resizeMode="stretch"
                            >
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="e.g., Gym Week, Family Dinner"
                                    value={formName}
                                    onChangeText={setFormName}
                                    placeholderTextColor="#A0A0A0"
                                />
                            </ImageBackground>

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
                                style={{ height: isTabletView ? 100 : 70, flexGrow: 0 }}
                                contentContainerStyle={{ gap: 10, marginBottom: 25 }}
                                renderItem={({ item }) => {
                                    const isActive = formStartDate.toDateString() === item.date.toDateString();
                                    return (
                                        <TouchableOpacity
                                            style={[styles.pillWrapper, { width: isTabletView ? 150 : 110, height: isTabletView ? 60 : 40 }]}
                                            onPress={() => setFormStartDate(item.date)}
                                        >
                                            <ImageBackground
                                                source={
                                                    isActive
                                                        ? require('@/components/images/GeneralBlueButton.png')
                                                        : require('@/components/images/GeneralWoodenButton.png')
                                                }
                                                style={[styles.pillImageBackground]}
                                                resizeMode="stretch"
                                            >
                                                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{item.label}</Text>
                                            </ImageBackground>

                                        </TouchableOpacity>
                                    );
                                }}
                            />

                            <Text style={styles.inputLabel}>Duration (Days)</Text>
                            <View style={styles.pillContainer}>
                                {[1, 2, 3, 5, 7].map(day => {
                                    const isActive = formDays === day;

                                    return (
                                        <TouchableOpacity
                                            key={day}
                                            style={styles.pillWrapper}
                                            onPress={() => setFormDays(day)}
                                        >
                                            <ImageBackground
                                                source={
                                                    isActive
                                                        ? require('@/components/images/GeneralBlueButton.png')
                                                        : require('@/components/images/GeneralWoodenButton.png')
                                                }
                                                style={[styles.pillImageBackground]}
                                                resizeMode="stretch"
                                            >
                                                <Text style={[styles.pillText, formDays === day && styles.pillTextActive]}>{day}</Text>
                                            </ImageBackground>

                                        </TouchableOpacity>
                                    )
                                })}
                            </View>

                            <Text style={styles.inputLabel}>Add Groceries To Which Fridge</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ height: isTabletView ? 100 : 80, flexGrow: 0 }}
                                contentContainerStyle={{ gap: 10, paddingVertical: 5, alignItems: 'center' }}>
                                {/* All */}
                                <TouchableOpacity
                                    style={[styles.pillWrapper, { width: isTabletView ? 150 : 85, height: isTabletView ? 60 : 50 }]}
                                    onPress={() => setFormTargetFridge('ALL')}
                                >
                                    <ImageBackground
                                        source={
                                            formTargetFridge === 'ALL'
                                                ? require('@/components/images/GeneralBlueButton.png')
                                                : require('@/components/images/GeneralWoodenButton.png')
                                        }
                                        style={[styles.pillImageBackground]}
                                        resizeMode="stretch"
                                    >
                                        <Text style={[styles.pillText, formTargetFridge === 'ALL' && styles.pillTextActive]}>All</Text>
                                    </ImageBackground>

                                </TouchableOpacity>

                                {/* Current List */}
                                <TouchableOpacity
                                    style={[styles.pillWrapper, { width: isTabletView ? 150 : 100, height: isTabletView ? 60 : 50 }]}
                                    onPress={() => setFormTargetFridge('CREATE_NEW')}
                                >
                                    <ImageBackground
                                        source={
                                            formTargetFridge === 'CREATE_NEW'
                                                ? require('@/components/images/GeneralBlueButton.png')
                                                : require('@/components/images/GeneralWoodenButton.png')
                                        }
                                        style={[styles.pillImageBackground]}
                                        resizeMode="stretch"
                                    >
                                        <Text style={[styles.pillText, formTargetFridge === 'CREATE_NEW' && styles.pillTextActive]}>Current List</Text>
                                    </ImageBackground>

                                </TouchableOpacity>

                                {/* Mapped User Lists */}
                                {userLists.map(list => {
                                    const listId = list.listId || list.id || list._id;
                                    const listName = list.listName || list.name || "Unnamed List";
                                    const isActive = formTargetFridge === listId;

                                    return (
                                        <TouchableOpacity
                                            key={listId}
                                            style={[styles.pillWrapper, { width: isTabletView ? 150 : 100, height: isTabletView ? 60 : 50 }]}
                                            onPress={() => setFormTargetFridge(listId)}
                                        >
                                            <ImageBackground
                                                source={
                                                    isActive
                                                        ? require('@/components/images/GeneralBlueButton.png')
                                                        : require('@/components/images/GeneralWoodenButton.png')
                                                }
                                                style={[styles.pillImageBackground]}
                                                resizeMode="stretch"
                                            >
                                                <Text style={[styles.pillText, isActive && styles.pillTextActive, { fontSize: isTabletView ? 10 : 8 }]}>{listName}</Text>
                                            </ImageBackground>

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
                                                style={[styles.pillWrapper, { width: isTabletView ? 150 : 85, height: isTabletView ? 50 : 40 }]}
                                                onPress={() => setFormMeals(prev => ({ ...prev, [meal]: !isActive }))}
                                            >
                                                <ImageBackground
                                                    source={
                                                        isActive
                                                            ? require('@/components/images/GeneralBlueButton.png')
                                                            : require('@/components/images/GeneralWoodenButton.png')
                                                    }
                                                    style={[styles.pillImageBackground]}
                                                    resizeMode="stretch"
                                                >
                                                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                                                        {meal.charAt(0).toUpperCase() + meal.slice(1)}
                                                    </Text>
                                                </ImageBackground>

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
                                                            style={[styles.pillWrapper, { width: isTabletView ? 130 : 60, height: isTabletView ? 50 : 40 }]}
                                                            onPress={() => toggleAdvancedMeal(dayIndex, meal)}
                                                        >
                                                            <ImageBackground
                                                                source={
                                                                    isActive
                                                                        ? require('@/components/images/GeneralBlueButton.png')
                                                                        : require('@/components/images/GeneralWoodenButton.png')
                                                                }
                                                                style={[styles.pillImageBackground]}
                                                                resizeMode="stretch"
                                                            >
                                                                <Text style={[styles.pillTextSmall, isActive && styles.pillTextActive]}>
                                                                    {meal.charAt(0).toUpperCase() + meal.slice(1)}
                                                                </Text>
                                                            </ImageBackground>

                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <Text style={styles.inputLabel}>Allergies / Restrictions</Text>

                            <ImageBackground
                                source={require('@/assets/images/listing/DescriptionBG.png')}
                                style={[styles.modalInputContainer]}
                                resizeMode="stretch"
                            >
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="e.g., Peanuts, Vegan, None"
                                    value={formAllergies}
                                    onChangeText={setFormAllergies}
                                    placeholderTextColor="#A0A0A0"
                                />
                            </ImageBackground>


                            <TouchableOpacity style={styles.submitFormButtonWrapper} onPress={submitMealPlanForm}>
                                <ImageBackground
                                    source={require("@/assets/images/listing/TitlePanel.png")}
                                    style={styles.submitFormButton}
                                    resizeMode='contain'
                                >
                                    <Text style={styles.submitFormText}>Generate Plan</Text>
                                </ImageBackground>

                            </TouchableOpacity>

                        </ScrollView>
                    </ImageBackground>
                </KeyboardAvoidingView>
            </Modal>
        );
    };

    const renderFridgeCookModal = () => {

        // Button Helper Fnction
        const formatButtonText = (text) => {
            // If it's short, or a single giant word with no spaces, leave it alone
            if (text.length <= 12 || !text.includes(' ')) return text;

            const words = text.split(' ');
            const middle = Math.floor(text.length / 2);

            let line1 = "";
            let line2 = "";

            for (let word of words) {
                // Fill line 1 until we hit the middle of the string
                if (line1.length < middle) {
                    line1 += (line1.length > 0 ? " " : "") + word;
                } else {
                    line2 += (line2.length > 0 ? " " : "") + word;
                }
            }
            // Return with a physical line break
            return line2 ? `${line1}\n${line2}` : line1;
        };

        return (
            <Modal visible={showFridgeForm} transparent animationType="fade">
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <ImageBackground
                        source={require('@/assets/images/listing/icons/ItemBorder.png')}
                        style={[styles.modalCard]}
                        resizeMode='stretch'
                    >

                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Fridge</Text>

                            <TouchableOpacity
                                onPress={() => setShowFridgeForm(false)}
                                style={styles.headerIcon}
                            >
                                <Image
                                    source={require("@/components/images/ExitButton.png")}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode='contain'
                                />
                            </TouchableOpacity>

                        </View>

                        {/* Separator */}
                        <Image
                            source={require('@/components/images/Separator.png')}
                            style={{
                                width: '100%'
                            }}
                            resizeMode='stretch'
                        />

                        {/* Fridge Selector */}
                        <Text style={styles.inputLabel}>Which list should I look in?</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{}}
                            contentContainerStyle={{ gap: 10, paddingVertical: 10, alignItems: 'center' }}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.pillWrapper,
                                    {
                                        width: isTabletView ? 150 : 100,
                                        height: isTabletView ? 60 : 50,
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }
                                ]}
                                onPress={() => setCookTargetFridge('ALL')}
                            >
                                <ImageBackground
                                    source={
                                        cookTargetFridge === 'ALL'
                                            ? require('@/components/images/GeneralBlueButton.png')
                                            : require('@/components/images/GeneralWoodenButton.png')
                                    }
                                    style={[
                                        styles.pillImageBackground,
                                        { width: 'auto', paddingHorizontal: isTabletView ? 24 : 16 }
                                    ]}
                                    resizeMode="stretch"
                                >
                                    <Text style={[styles.pillText, cookTargetFridge === 'ALL' && styles.pillTextActive]}>All Lists</Text>
                                </ImageBackground>

                            </TouchableOpacity>

                            {userLists.map(list => {
                                const listId = list.listId || list.id || list._id;
                                const listName = list.listName || list.name || "Unnamed List";
                                const isActive = cookTargetFridge === listId;

                                const displayListText = formatButtonText(listName);

                                return (
                                    <TouchableOpacity
                                        key={listId}
                                        style={[
                                            styles.pillWrapper,
                                            {
                                                width: 'auto',
                                                minWidth: isTabletView ? 120 : 90,
                                                height: isTabletView ? 60 : 50,
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }
                                        ]}
                                        onPress={() => setCookTargetFridge(listId)}
                                    >
                                        <ImageBackground
                                            source={
                                                isActive
                                                    ? require('@/components/images/GeneralBlueButton.png')
                                                    : require('@/components/images/GeneralWoodenButton.png')
                                            }
                                            style={[
                                                styles.pillImageBackground,
                                                { width: 'auto', paddingHorizontal: isTabletView ? 24 : 16 }
                                            ]}
                                            resizeMode="stretch"
                                        >
                                            <Text
                                                numberOfLines={2}
                                                style={[
                                                    styles.pillText,
                                                    isActive && styles.pillTextActive,
                                                    { textAlign: 'center', lineHeight: isTabletView ? 16 : 14 }
                                                ]}
                                            >
                                                {displayListText}
                                            </Text>
                                        </ImageBackground>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={[
                                styles.submitFormButtonWrapper,
                                {
                                    width: '60%',
                                    height: isTabletView ? 80 : 50
                                }
                            ]}
                            onPress={submitFridgeCookRequest}
                        >
                            <ImageBackground
                                source={require('@/assets/images/listing/TitlePanel.png')}
                                style={styles.submitFormButton}
                                resizeMode='stretch'
                            >
                                <Text style={styles.submitFormText}>Find Recipes</Text>
                            </ImageBackground>
                        </TouchableOpacity>

                    </ImageBackground>

                </KeyboardAvoidingView>
            </Modal>
        );
    };


    // ==========================================
    // ANIMATION
    // ==========================================

    // --- ANIMATED TYPING INDICATOR ---
    const TypingIndicator = () => {
        const dot1 = useRef(new Animated.Value(0)).current;
        const dot2 = useRef(new Animated.Value(0)).current;
        const dot3 = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            const animateDot = (dot, delay) => {
                return Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]);
            };

            const animationLoop = Animated.loop(
                Animated.parallel([
                    animateDot(dot1, 0),
                    animateDot(dot2, 150),
                    animateDot(dot3, 300),
                ])
            );

            animationLoop.start();
            return () => animationLoop.stop();
        }, [dot1, dot2, dot3]);

        const translateY1 = dot1.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
        const translateY2 = dot2.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
        const translateY3 = dot3.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

        return (
            <View style={styles.typingContainer}>
                <Animated.View style={[styles.typingDot, { transform: [{ translateY: translateY1 }] }]} />
                <Animated.View style={[styles.typingDot, { transform: [{ translateY: translateY2 }] }]} />
                <Animated.View style={[styles.typingDot, { transform: [{ translateY: translateY3 }] }]} />
            </View>
        );
    };

    // --- SOUND WAVE PULSE ANIMATION ---
    const PulseAnimation = () => {
        const wave1 = useRef(new Animated.Value(1)).current;
        const wave2 = useRef(new Animated.Value(1)).current;
        const wave3 = useRef(new Animated.Value(1)).current;

        useEffect(() => {
            const createWave = (anim, delay) => {
                return Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.parallel([
                            Animated.timing(anim, { toValue: 2.5, duration: 2000, useNativeDriver: true }),
                        ]),
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

            return () => {
                animations.forEach(anim => anim.stop());
            };
        }, []);

        return (
            <View style={styles.pulseWrapper}>
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: wave1 }], opacity: wave1.interpolate({ inputRange: [1, 2.5], outputRange: [0.6, 0] }) }]} />
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: wave2 }], opacity: wave2.interpolate({ inputRange: [1, 2.5], outputRange: [0.6, 0] }) }]} />
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: wave3 }], opacity: wave3.interpolate({ inputRange: [1, 2.5], outputRange: [0.6, 0] }) }]} />
            </View>
        );
    };

    // ==========================================
    // MAIN RENDER
    // ==========================================
    return (
        <View style={{ flex: 1 }}>
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

                        <View style={{ flex: 1 }}>
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
                                    ListFooterComponent={renderFooter}
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

                                    {/* Voice Overlay Button */}
                                    <TouchableOpacity onPress={() => setShowVoiceModal(true)} style={styles.micIconWrapper}>
                                        <Image
                                            source={require('@/components/images/MicOff.png')}
                                            style={styles.micIcon}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>

                                </ImageBackground>

                                {/* Send Button */}
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
                        </View>

                    </KeyboardAvoidingView>

                    {/* Overlays */}
                    {renderMealPlanModal()}
                    {renderFridgeCookModal()}
                    {renderAddToListModal()}
                    <VoiceInputModal
                        visible={showVoiceModal}
                        onClose={() => {
                            setShowVoiceModal(false);
                            if (activeInputContext === 'ADD_TO_LIST') {
                                setTimeout(() => setShowAddToListForm(true), 300);
                            }
                        }}
                        onComplete={handleVoiceComplete}
                    />


                </SafeAreaView>
            </ImageBackground>
        </View>

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
    },
    headerTitle: {
        fontSize: isTabletView ? 24 : 18,
        fontFamily: 'PixelFont',
        color: '#333',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    welcomeContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
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

    // --- Bubbles Styls ---
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

    // --- AI Bubbles Action Button --- 
    actionButtonWrapper: {
        marginTop: 12,
        height: isTabletView ? 50 : 40,
        width: isTabletView ? 160 : 130,
        alignSelf: 'flex-start',
    },
    actionButtonBg: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonText: {
        fontFamily: 'PixelFont',
        color: '#FFFFFF',
        fontSize: isTabletView ? 12 : 10,
        textAlign: 'center',
        includeFontPadding: false,
        textAlignVertical: 'center',
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
        flexDirection: 'row',
        minHeight: 60,
        alignItems: 'center',
        marginRight: 10,
        paddingLeft: '5%',
        paddingRight: '4%',
        paddingTop: 14,
        paddingBottom: 14,
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        fontSize: isTabletView ? 16 : 12,
        fontFamily: 'PixelFont',
        color: '#5C4033',
        minHeight: 24,
        maxHeight: 100,
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    micIconWrapper: {
        paddingHorizontal: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micIcon: {
        width: isTabletView ? 28 : 20,
        height: isTabletView ? 28 : 20,
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
        borderRadius: 20,
        paddingVertical: isTabletView ? "10%" : '14%',
        paddingHorizontal: '10%',
        maxHeight: "90%",
        minHeight: "40%",

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
        fontSize: isTabletView ? 22 : 18,
        fontFamily: 'PixelFont',
        color: '#333',
    },
    inputLabel: {
        fontSize: isTabletView ? 14 : 12,
        fontFamily: 'PixelFont',
        color: '#555',
        marginBottom: 8,
        marginTop: 20,
    },
    modalInputContainer: {
        flex: 1,
        minHeight: isTabletView ? 70 : 60,
        justifyContent: 'center',
        marginRight: 10,
    },
    modalInput: {
        borderRadius: 12,
        padding: 14,
        fontSize: isTabletView ? 12 : 10,
        fontFamily: 'PixelFont',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    pillContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 0
    },
    pillWrapper: {
        width: '18%',
        height: isTabletView ? 50 : 40,
    },
    pillImageBackground: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4
    },
    pill: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#F0F0F0',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    pillText: {
        fontSize: isTabletView ? 14 : 10,
        fontFamily: 'PixelFont',
        color: '#555',
        textAlign: 'center',
        paddingHorizontal: 5,
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    pillTextActive: {
        color: '#FFFFFF',
    },
    submitFormButtonWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginTop: 28,
        width: '60%',
        height: '15%',
    },
    submitFormButton: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitFormText: {
        color: '#FFFFFF',
        fontFamily: 'PixelFont',
        textAlign: 'center',
        paddingHorizontal: '10%',
        fontSize: isTabletView ? 18 : 12,
        includeFontPadding: false
    },
    colorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        width: '100%'
    },
    colorCircle: {
        width: "15%",
        aspectRatio: 1,
        borderRadius: isTabletView ? 10 : 8,
        borderWidth: isTabletView ? 5 : 3,
        borderColor: '#8B5A2B'
    },
    colorCircleActive: {
        borderColor: '#3E2723',
        transform: [{ scale: 1.1 }]
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
        fontFamily: 'PixelFont',
        top: 5
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
        fontFamily: 'PixelFont',
        color: '#444',
        includeFontPadding: false,
        textAlignVertical: 'center'
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
        fontSize: isTabletView ? 8 : 6,
        color: '#555',
        fontFamily: 'PixelFont',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },

    // Typing Indicator
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: 4,
    },
    typingDot: {
        width: 8,
        height: 8,
        backgroundColor: '#623d23',
        borderRadius: 2,
    }
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
        color: 'black',
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
        backgroundColor: '#D4BA8C',
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