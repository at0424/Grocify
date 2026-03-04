import { getUserId } from '@/amplify/auth/authService';
import { batchAddListItems, createNewList, createUserPlan, fetchGroceryCatalog, fetchRecipes, fetchUserLists } from '@/services/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, Edit3, Moon, RefreshCw, Snowflake, Sun, Utensils } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function MealPlanPreviewScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [plan, setPlan] = useState([]);
    const [recipePool, setRecipePool] = useState({});
    const [swappingSlot, setSwappingSlot] = useState(null);
    const [catalogMap, setCatalogMap] = useState(new Map());
    const [customName, setCustomName] = useState("");

    // Fridge Selection State
    const [userFridges, setUserFridges] = useState([]);
    const [selectedFridgeId, setSelectedFridgeId] = useState('ALL');

    // Initialization
    useEffect(() => {
        const init = async () => {
            await Promise.all([generateInitialPlan(), loadFridges()]);
            setLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        const loadCatalog = async () => {
            try {
                const data = await fetchGroceryCatalog();
                const map = new Map();
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        if (item.name) {
                            map.set(item.name.toLowerCase().trim(), item);
                        }
                    });
                }
                setCatalogMap(map);
            } catch (error) {
                console.error("Failed to load catalog for lookup:", error);
            }
        };
        loadCatalog();
    }, []);

    // Fetch user's fridges/lists for the selector chips
    const loadFridges = async () => {
        try {
            const userId = await getUserId();
            if (!userId) return;

            const userListsData = await fetchUserLists(userId);
            const lists = Array.isArray(userListsData) ? userListsData : [];

            const formattedLists = lists.map(list => ({
                id: list.listId,
                name: list.listName || list.name || "Untitled List"
            }));

            setUserFridges(formattedLists);

        } catch (error) {
            console.error("Failed to load user lists:", error);
        }
    };

    const generateSlotId = () => `slot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const generateInitialPlan = async () => {
        try {
            const selections = JSON.parse(params.selections || '{}');
            const dates = Object.keys(selections).sort();

            // Fetch ALL recipes from your DynamoDB
            const [bfList, lnList, dnList] = await Promise.all([
                fetchRecipes('Breakfast'),
                fetchRecipes('Lunch'),
                fetchRecipes('Dinner')
            ]);

            setRecipePool({
                breakfast: bfList,
                lunch: lnList,
                dinner: dnList
            });

            // Build the Schedule
            const newPlan = dates.map(dateKey => {
                const daySelection = selections[dateKey];
                const dayPlan = { date: dateKey, meals: [] };

                if (daySelection.breakfast) {
                    dayPlan.meals.push({ slotId: generateSlotId(), type: 'Breakfast', recipe: getRandomRecipe(bfList) });
                }
                if (daySelection.lunch) {
                    dayPlan.meals.push({ slotId: generateSlotId(), type: 'Lunch', recipe: getRandomRecipe(lnList) });
                }
                if (daySelection.dinner) {
                    dayPlan.meals.push({ slotId: generateSlotId(), type: 'Dinner', recipe: getRandomRecipe(dnList) });
                }

                return dayPlan;
            });

            setPlan(newPlan);

        } catch (error) {
            console.error("Generation Error:", error);
            Alert.alert("Error", "Failed to generate plan. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Listen for the 'event.recipeSelected' event from RecipesListScreen
        const subscription = DeviceEventEmitter.addListener('event.recipeSelected', (selectedRecipe) => {
            if (swappingSlot && selectedRecipe) {
                // Update the plan with the user's chosen recipe
                setPlan(currentPlan => {
                    return currentPlan.map(day => {
                        if (day.date === swappingSlot.date) {
                            const updatedMeals = day.meals.map(meal => {
                                if (meal.slotId === swappingSlot.slotId) {
                                    return { ...meal, recipe: selectedRecipe };
                                }
                                return meal;
                            });
                            return { ...day, meals: updatedMeals };
                        }
                        return day;
                    });
                });
                // Clear the tracker
                setSwappingSlot(null);
            }
        });

        // Cleanup listener on unmount
        return () => {
            subscription.remove();
        };
    }, [swappingSlot]);

    // Pick Random Recipe 
    const getRandomRecipe = (list) => {
        if (!list || list.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * list.length);
        return list[randomIndex];
    };

    // Swap Recipe
    const handleSwap = (dateKey, slotId, mealType) => {
        setSwappingSlot({ date: dateKey, slotId: slotId, type: mealType });

        router.push({
            pathname: '/recipes_list',
            params: { type: mealType }
        });
    };

    // Handle create meal plan AND grocery list
    const handleCreatePlan = async () => {
        setSaving(true);
        try {
            const currentUser = await getUserId();

            // Create List 
            const startDateObj = new Date(params.start);
            const dateLabel = startDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const listName = customName.trim() ? customName.trim() : `Groceries (${dateLabel})`;
            const listResponse = await createNewList(currentUser, listName, '#7A9B6B');

            if (!listResponse || !listResponse.success) throw new Error("List creation failed");
            const newListId = listResponse.data.listId;

            // Collect Ingredients with Lookup 
            const aggregator = new Map();

            plan.forEach(day => {
                day.meals.forEach(meal => {
                    if (meal.recipe && meal.recipe.ingredients) {
                        meal.recipe.ingredients.forEach(ing => {
                            const rawName = ing.groceryName || "Unknown Item";
                            const cleanName = rawName.trim();
                            const lowerName = cleanName.toLowerCase();

                            // Check if this item exists in fetched catalog
                            if (!catalogMap.has(lowerName)) {
                                console.log(`⚠️ MISSING IN CATALOG: "${cleanName}"`);
                            }
                            const catalogItem = catalogMap.get(lowerName) || {};

                            // Extract Data
                            const category = catalogItem.category || ing.category || "Uncategorized";
                            const shelfLife = catalogItem.shelfLife || ing.shelfLife || "7";

                            // Parse Amount & Unit
                            const amount = parseFloat(ing.amount) || 0;
                            const unit = (ing.unit || "").trim().toLowerCase();

                            if (!aggregator.has(lowerName)) {
                                aggregator.set(lowerName, {
                                    name: cleanName,
                                    category: category,
                                    shelfLife: shelfLife,
                                    measurements: []
                                });
                            }

                            aggregator.get(lowerName).measurements.push({ amount, unit });
                        });
                    }
                });
            });

            const finalIngredients = [];

            aggregator.forEach((data) => {
                // Group amounts by their Unit
                // Example: { "tbsp": 2, "cup": 1 }
                const unitTotals = new Map();
                const textOnlyUnits = []; // For items with no amount (e.g. "Salt" with no "1")

                data.measurements.forEach(m => {
                    if (m.amount > 0) {
                        const current = unitTotals.get(m.unit) || 0;
                        unitTotals.set(m.unit, current + m.amount);
                    } else {
                        if (m.unit) textOnlyUnits.push(m.unit);
                    }
                });

                // Build the final string: "2 tbsp, 1 cup"
                const parts = [];

                unitTotals.forEach((total, unit) => {
                    // Round to avoid "0.300000004 tbsp"
                    const roundedTotal = Math.round(total * 100) / 100;
                    parts.push(`${roundedTotal} ${unit}`.trim());
                });

                // Add non-numeric units (unique only)
                [...new Set(textOnlyUnits)].forEach(u => parts.push(u));

                // Fallback for empty strings
                let finalQty = parts.join(", ");
                if (!finalQty) finalQty = ""; // Default empty string

                finalIngredients.push({
                    name: data.name,
                    quantity: finalQty,
                    category: data.category,
                    shelfLife: data.shelfLife
                });
            });

            console.log(`Queueing ${finalIngredients.length} unique items...`);

            try {
                console.log("Sending entire ingredient list to the cloud...");
                await batchAddListItems(newListId, finalIngredients);
            } catch (err) {
                throw new Error("Failed to batch upload ingredients.");
            }
            
            // Choosing Target Fridges
            let finalTargetFridges = [];
            if (selectedFridgeId === 'ALL') {
                finalTargetFridges = ['ALL'];
            } else if (selectedFridgeId === 'CURRENT_PLAN') {
                finalTargetFridges = [newListId]; 
            } else {
                finalTargetFridges = [selectedFridgeId];
            }

            // Create Plan & Finish 
            const payload = {
                userId: currentUser,
                startDate: params.start,
                endDate: params.end,
                days: plan,
                targetFridges: finalTargetFridges
            };

            await createUserPlan(payload);

            if (router.canDismiss()) router.dismissAll();
            router.replace({ pathname: '/(tabs)/(meal_plan)', params: { refresh: 'true' } });

        } catch (error) {
            console.error("Creation Error:", error);
            Alert.alert("Error", "Could not create plan.");
        } finally {
            setSaving(false);
        }
    };
    
    // Add Extra Dishes
    const handleAddDishPrompt = (dateKey) => {
        Alert.alert(
            "Add Another Dish",
            "Which meal would you like to add an extra dish to?",
            [
                { text: "Breakfast", onPress: () => addExtraDish(dateKey, 'Breakfast') },
                { text: "Lunch", onPress: () => addExtraDish(dateKey, 'Lunch') },
                { text: "Dinner", onPress: () => addExtraDish(dateKey, 'Dinner') },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const addExtraDish = (dateKey, mealType) => {
        // Pick the correct recipe pool
        const pool = mealType === 'Breakfast' ? recipePool.breakfast :
                     mealType === 'Lunch' ? recipePool.lunch :
                     recipePool.dinner;

        setPlan(currentPlan => {
            return currentPlan.map(day => {
                if (day.date === dateKey) {
                    const newDish = {
                        slotId: generateSlotId(),
                        type: mealType,
                        recipe: getRandomRecipe(pool)
                    };
                    
                    // Add the new dish to the day's array
                    const updatedMeals = [...day.meals, newDish];
                    
                    // Keep them sorted properly (Breakfast -> Lunch -> Dinner)
                    const order = { 'Breakfast': 1, 'Lunch': 2, 'Dinner': 3 };
                    updatedMeals.sort((a, b) => order[a.type] - order[b.type]);

                    return { ...day, meals: updatedMeals };
                }
                return day;
            });
        });
    };

    // Icon type
    const getIconForType = (type) => {
        switch (type) {
            case 'Breakfast': return <Sun size={20} color="#7A9B6B" />;
            case 'Lunch': return <Utensils size={20} color="#F59E0B" />;
            case 'Dinner': return <Moon size={20} color="#4B5563" />;
            default: return <Utensils size={20} color="#7A9B6B" />;
        }
    };

    const formatDateTitle = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#7A9B6B" />
                <Text style={styles.loadingText}>Curating your menu...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Meal Plan Preview</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.contentContainer}>
                <Text style={styles.subHeader}>
                    Here are the recipes we have chosen for your meal plan! Feel free to modify it.
                </Text>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {plan.map((day, index) => (
                        <View key={day.date} style={styles.daySection}>
                            {/* Day Header */}
                            <Text style={styles.dayHeaderTitle}>{formatDateTitle(day.date)}</Text>

                            {/* Meal Cards */}
                            {day.meals.map((meal, mIndex) => (
                                <TouchableOpacity
                                    key={meal.slotId}
                                    style={styles.mealCard}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        // Check if recipe exists
                                        if (!meal.recipe) return;

                                        // Navigate to Details Page
                                        router.push({
                                            pathname: '/recipes_details',
                                            params: { recipeData: JSON.stringify(meal.recipe) }
                                        });
                                    }}
                                >

                                    {/* Icon Box */}
                                    <View style={styles.iconBox}>
                                        {getIconForType(meal.type)}
                                    </View>

                                    {/* Text Info */}
                                    <View style={styles.mealInfo}>
                                        <Text style={styles.mealTypeLabel}>
                                            {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
                                        </Text>
                                        <Text style={styles.recipeName}>
                                            {meal.recipe ? meal.recipe.mealName : "Loading..."}
                                        </Text>
                                        {meal.recipe && (
                                            <Text style={styles.caloriesText}>
                                                {meal.recipe.calories} kcal • {meal.recipe.prepTime} min
                                            </Text>
                                        )}
                                    </View>

                                    {/* Swap Button - Keep this separate! */}
                                    {/* We use a View to intercept the touch so swapping doesn't open the page */}
                                    <TouchableOpacity
                                        style={styles.refreshButton}
                                        onPress={() => handleSwap(day.date, meal.slotId, meal.type)}
                                    >
                                        <RefreshCw size={18} color="#7A9B6B" />
                                    </TouchableOpacity>
                                </TouchableOpacity>      
                            ))}

                            <TouchableOpacity 
                                style={styles.addDishButton}
                                onPress={() => handleAddDishPrompt(day.date)}
                            >
                                <Text style={styles.addDishText}>+ Add dish to this day</Text>
                            </TouchableOpacity>

                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Footer */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                style={styles.footerWrapper} // Wrapper needed for positioning
            >
                <View style={styles.footerContainer}>
                    {/* Name Input Section */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Plan Name (Optional)</Text>
                        <View style={styles.inputWrapper}>
                            <Edit3 size={16} color="#A0AEC0" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.textInput}
                                placeholder={`Groceries (${new Date(params.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                                placeholderTextColor="#CBD5E0"
                                value={customName}
                                onChangeText={setCustomName}
                                returnKeyType="done"
                            />
                        </View>
                    </View>

                    {/* Fridge Selector */}
                    <View style={styles.fridgeHeaderRow}>
                        <Snowflake size={16} color="#5E8050" />
                        <Text style={styles.fridgeLabel}>Check ingredients against:</Text>
                    </View>

                    {/* Horizontal Scroll of Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        {/* Default: ALL */}
                        <TouchableOpacity
                            style={[styles.chip, selectedFridgeId === 'ALL' && styles.chipActive]}
                            onPress={() => setSelectedFridgeId('ALL')}
                        >
                            <Text style={[styles.chipText, selectedFridgeId === 'ALL' && styles.chipTextActive]}>
                                All Inventory
                            </Text>
                            {selectedFridgeId === 'ALL' && <CheckCircle2 size={14} color="#FFF" style={{ marginLeft: 4 }} />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.chip, selectedFridgeId === 'CURRENT_PLAN' && styles.chipActive]}
                            onPress={() => setSelectedFridgeId('CURRENT_PLAN')}
                        >
                            <Text style={[styles.chipText, selectedFridgeId === 'CURRENT_PLAN' && styles.chipTextActive]}>
                                Current Meal Plan
                            </Text>
                            {selectedFridgeId === 'CURRENT_PLAN' && <CheckCircle2 size={14} color="#FFF" style={{ marginLeft: 4 }} />}
                        </TouchableOpacity>

                        {/* Dynamic User Lists */}
                        {userFridges.map((fridge) => {
                            const isSelected = selectedFridgeId === fridge.id;
                            return (
                                <TouchableOpacity
                                    key={fridge.id}
                                    style={[styles.chip, isSelected && styles.chipActive]}
                                    onPress={() => setSelectedFridgeId(fridge.id)}
                                >
                                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                        {fridge.name}
                                    </Text>
                                    {isSelected && <CheckCircle2 size={14} color="#FFF" style={{ marginLeft: 4 }} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleCreatePlan}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.confirmButtonText}>Confirm & Create Plan</Text>
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
        backgroundColor: '#FFFFFF',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#7A9B6B',
        fontWeight: '600',
    },
    // Header
    header: {
        backgroundColor: '#7A9B6B',
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    contentContainer: {
        flex: 1,
        padding: 20,
    },
    subHeader: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        lineHeight: 20,
    },

    // List Styles
    daySection: {
        marginBottom: 24,
    },
    dayHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2C3A26',
        marginBottom: 12,
    },
    mealCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#EDF2F7',
    },
    mealInfo: {
        flex: 1,
    },
    mealTypeLabel: {
        fontSize: 12,
        color: '#A0AEC0',
        fontWeight: '600',
        marginBottom: 2,
    },
    recipeName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2D3748',
        marginBottom: 2,
    },
    caloriesText: {
        fontSize: 12,
        color: '#718096',
    },
    refreshButton: {
        padding: 10,
        backgroundColor: '#E8EDE6', // Light Green bg
        borderRadius: 10,
    },
    emptyDayText: {
        color: '#A0AEC0',
        fontStyle: 'italic',
        fontSize: 13,
    },
    // Add Dish Button
    addDishButton: {
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: -4,
        marginBottom: 10,
    },
    addDishText: {
        color: '#7A9B6B',
        fontWeight: '600',
        fontSize: 14,
    },

    // Footer
    footerWrapper: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
    },
    footerContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 40,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20,
    },
    // Input Section
    inputSection: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#718096',
        marginBottom: 6,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    textInput: {
        flex: 1,
        fontSize: 14,
        color: '#2D3748',
        fontWeight: '500',
    },
    // Fridge Header Row
    fridgeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    fridgeLabel: { fontSize: 14, color: '#5E8050', fontWeight: '600' },
    // Chip Scroll
    chipScroll: { marginBottom: 20, maxHeight: 40 },
    chip: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, paddingHorizontal: 16,
        borderRadius: 20, backgroundColor: '#EDF2F7',
        marginRight: 8, borderWidth: 1, borderColor: 'transparent',
    },
    chipActive: { backgroundColor: '#5E8050', borderColor: '#4A683E' },
    chipText: { fontSize: 13, color: '#718096', fontWeight: '600' },
    chipTextActive: { color: '#FFFFFF' },
    // Confirm Button
    confirmButton: { backgroundColor: '#7A9B6B', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

});