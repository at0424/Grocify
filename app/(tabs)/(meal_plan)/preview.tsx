import { getUserId } from '@/amplify/auth/authService';
import { batchAddListItems, createNewList, createUserPlan, fetchGroceryCatalog, fetchRecipes, fetchUserLists, fetchUserMealPlan, updateUserPlan } from '@/services/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Moon, Snowflake, Sun, Utensils } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    Dimensions,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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
    const [existingPlan, setExistingPlan] = useState(null);
    const [addingDishDate, setAddingDishDate] = useState(null);

    // Fridge Selection State
    const [userFridges, setUserFridges] = useState([]);
    const [selectedFridgeId, setSelectedFridgeId] = useState('ALL');

    // Initialization
    useEffect(() => {
        const init = async () => {
            const currentUserId = await getUserId();
            const activePlan = await fetchUserMealPlan(currentUserId);

            if (activePlan && activePlan.planData) {
                setExistingPlan(activePlan);
            }

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

    // Delete a Dish
    const handleDeleteDish = (dateKey, slotId) => {
        setPlan(currentPlan => {
            return currentPlan.map(day => {
                if (day.date === dateKey) {
                    const filteredMeals = day.meals.filter(meal => meal.slotId !== slotId);
                    return { ...day, meals: filteredMeals };
                }
                return day;
            });
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
            const listResponse = await createNewList(currentUser, listName, '#FFF9C4');

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
                                console.log(`MISSING IN CATALOG: "${cleanName}"`);
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

            if (existingPlan && existingPlan.planId) {
                console.log("Extending existing meal plan...");

                // Combine the old days and the new days
                const combinedDays = [...existingPlan.planData, ...plan];

                // Combine the fridge tracking (so it checks old & new grocery lists)
                const combinedFridges = [...new Set([...(existingPlan.targetFridges || []), ...finalTargetFridges])];

                const updatePayload = {
                    planId: existingPlan.planId,
                    userId: currentUser,
                    endDate: params.end, // The new extended end date
                    planData: combinedDays,
                    targetFridges: combinedFridges
                };

                await updateUserPlan(updatePayload); // We will create this API next

            } else {
                console.log("Creating brand new meal plan...");

                const createPayload = {
                    userId: currentUser,
                    startDate: params.start,
                    endDate: params.end,
                    days: plan,
                    targetFridges: finalTargetFridges
                };

                await createUserPlan(createPayload);
            }

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
        setAddingDishDate(dateKey);
    };

    const handleSelectMealType = (mealType) => {
        if (addingDishDate) {
            addExtraDish(addingDishDate, mealType);
        }
        setAddingDishDate(null);
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
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const monthAndDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `${dayName}\n${monthAndDate}`;
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

            <ImageBackground
                source={require('@/assets/images/meal_plan/MealPlanHeader.png')}
                style={styles.header}
                resizeMode='stretch'
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image
                        source={require('@/components/images/BackButton.png')}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode='contain'
                    />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Meal Plan Preview</Text>

                {/* Spacer to keep title perfectly centered */}
                <View style={styles.backButton} />
            </ImageBackground>

            <View style={styles.contentContainer}>
                <Text style={styles.subHeader}>
                    Here are the recipes we have chosen for your meal plan! Feel free to modify it.
                </Text>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: isTabletView ? '50%' : '65%' }}>
                    {plan.map((day, index) => (
                        <View key={day.date} style={styles.daySection}>

                            {/* Divider Line */}
                            <View style={styles.dividerLine} />

                            {/* Day Header */}
                            <ImageBackground
                                source={require('@/assets/images/meal_plan/MealLabel.png')}
                                style={styles.dayLabel}
                                imageStyle={{ resizeMode: 'stretch' }}
                            >
                                <Text style={styles.dayHeaderTitle}>{formatDateTitle(day.date)}</Text>
                            </ImageBackground>


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
                                    <View style={styles.recipeImageBox}>
                                        {meal.recipe && meal.recipe.imageUrl ? (
                                            <Image
                                                source={{ uri: meal.recipe.imageUrl }}
                                                style={styles.recipeImage}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            // Fallback to your icons if no image exists
                                            getIconForType(meal.type)
                                        )}
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
                                        style={styles.actionButton}
                                        onPress={() => handleSwap(day.date, meal.slotId, meal.type)}
                                    >
                                        <Image
                                            source={require('@/components/images/RefreshButton.png')}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode='contain'
                                        />

                                    </TouchableOpacity>

                                    {/* Delete Button */}
                                    <TouchableOpacity
                                        style={styles.deleteButtonBg}
                                        onPress={() => handleDeleteDish(day.date, meal.slotId)}
                                    >
                                        <Image
                                            source={require('@/components/images/ExitButton.png')}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode='contain'
                                        />
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
                style={styles.footerWrapper}
            >
                <ImageBackground
                    source={require('@/assets/images/meal_plan/MealPlanFooter.png')}
                    style={styles.footerContainer}
                    imageStyle={{ resizeMode: 'stretch' }}
                >
                    {/* Name Input Section */}
                    <View style={styles.inputSection}>

                        <Text style={styles.inputLabel}>Plan Name (Optional)</Text>
                        <View style={styles.inputWrapper}>

                            <Image
                                source={require('@/assets/images/listing/DescriptionBG.png')}
                                style={styles.backgroundImage}
                                resizeMode="stretch"
                            />

                            <View style={styles.inputContent}>

                                <Image
                                    source={require('@/components/images/EditPencil.png')}
                                    style={styles.pencilIcon}
                                    resizeMode="contain"
                                />

                                <TextInput
                                    style={styles.textInput}
                                    placeholder={`Groceries (${new Date(params.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                                    placeholderTextColor="#968373"
                                    value={customName}
                                    onChangeText={setCustomName}
                                    returnKeyType="done"
                                />
                            </View>
                        </View>

                    </View>

                    {/* Fridge Selector */}
                    <View style={styles.fridgeHeaderRow}>
                        <Snowflake size={16} color="#5E8050" />
                        <Text style={styles.fridgeLabel}>Check ingredients against:</Text>
                    </View>

                    {/* Horizontal Scroll of Chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.pillContainer}
                    >
                        {/* Default: ALL */}
                        <TouchableOpacity
                            style={styles.pillWrapper}
                            onPress={() => setSelectedFridgeId('ALL')}
                        >
                            <ImageBackground
                                source={
                                    selectedFridgeId === 'ALL'
                                        ? require('@/components/images/GeneralBlueButton.png')
                                        : require('@/components/images/GeneralWoodenButton.png')
                                }
                                style={[styles.pillImageBackground]}
                                resizeMode="stretch"
                            >
                                <Text style={[styles.chipText, selectedFridgeId === 'ALL' && styles.chipTextActive]}>
                                    All Inventory
                                </Text>
                            </ImageBackground>

                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.pillWrapper}
                            onPress={() => setSelectedFridgeId('CURRENT_PLAN')}
                        >
                            <ImageBackground
                                source={
                                    selectedFridgeId === 'CURRENT_PLAN'
                                        ? require('@/components/images/GeneralBlueButton.png')
                                        : require('@/components/images/GeneralWoodenButton.png')
                                }
                                style={[styles.pillImageBackground]}
                                resizeMode="stretch"
                            >
                                <Text style={[styles.chipText, selectedFridgeId === 'CURRENT_PLAN' && styles.chipTextActive]}>
                                    Current Meal Plan
                                </Text>
                            </ImageBackground>

                        </TouchableOpacity>

                        {/* Dynamic User Lists */}
                        {userFridges.map((fridge) => {
                            const isSelected = selectedFridgeId === fridge.id;
                            return (
                                <TouchableOpacity
                                    key={fridge.id}
                                    style={styles.pillWrapper}
                                    onPress={() => setSelectedFridgeId(fridge.id)}
                                >
                                    <ImageBackground
                                        source={
                                            isSelected
                                                ? require('@/components/images/GeneralBlueButton.png')
                                                : require('@/components/images/GeneralWoodenButton.png')
                                        }
                                        style={[styles.pillImageBackground]}
                                        resizeMode="stretch"
                                    >
                                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                            {fridge.name}
                                        </Text>
                                    </ImageBackground>

                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.confirmWoodButton}
                        onPress={handleCreatePlan}
                        disabled={saving}
                    >
                        <ImageBackground
                            source={require('@/assets/images/freshness/GreenButton.png')}
                            style={styles.confirmButtonBackgroundImage}
                            resizeMode='stretch'
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.confirmButtonText}>Confirm & Create Plan</Text>
                            )}
                        </ImageBackground>

                    </TouchableOpacity>
                </ImageBackground>
            </KeyboardAvoidingView>

            {/* Custom Pixel Art Modal for Adding a Dish */}
            <Modal
                visible={!!addingDishDate}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setAddingDishDate(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Add Another Dish</Text>
                        <Text style={styles.modalMessage}>Which meal would you like to add an extra dish to?</Text>

                        <TouchableOpacity style={styles.modalOptionButton} onPress={() => handleSelectMealType('Breakfast')}>
                            <Text style={styles.modalOptionText}>Breakfast</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOptionButton} onPress={() => handleSelectMealType('Lunch')}>
                            <Text style={styles.modalOptionText}>Lunch</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOptionButton} onPress={() => handleSelectMealType('Dinner')}>
                            <Text style={styles.modalOptionText}>Dinner</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeModalButton} onPress={() => setAddingDishDate(null)}>
                            <Text style={styles.closeModalButtonText}>Cancel</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const { width } = Dimensions.get('window');
const isTabletView = width > 710;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E4D5B7',
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
        height: isTabletView ? 100 : 70,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    backButton: {
        height: isTabletView ? 50 : 35,
        aspectRatio: 1,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: isTabletView ? 18 : 14,
        fontFamily: 'PixelFont',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    contentContainer: {
        flex: 1,
        padding: 20,
    },
    subHeader: {
        fontSize: isTabletView ? 14 : 10,
        fontFamily: 'PixelFont',
        color: '#666',
        marginBottom: 20,
        lineHeight: isTabletView ? 20 : 15,
        includeFontPadding: false,
        textAlignVertical: 'center'
    },

    // List Styles
    daySection: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        paddingVertical: 10,
    },
    dividerLine: {
        position: 'absolute',
        width: '100%',
        top: '8%',
        height: 3,
        backgroundColor: '#4A2F1D',
        zIndex: 0
    },
    dayLabel: {
        height: isTabletView ? 60 : 40,
        width: isTabletView ? 240 : 160,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    dayHeaderTitle: {
        fontSize: isTabletView ? 16 : 12,
        fontFamily: 'PixelFont',
        color: '#FFFFFF',
        textAlign: 'center',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    mealCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3E8D6',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#4A2F1D',
    },
    recipeImageBox: {
        height: isTabletView ? 80 : 55,
        aspectRatio: 1,
        borderRadius: 4,
        backgroundColor: '#E4D5B7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#4A2F1D',
        overflow: 'hidden',
    },
    recipeImage: {
        width: '100%',
        height: '100%',
    },
    mealInfo: {
        flex: 1,
    },
    mealTypeLabel: {
        fontSize: 12,
        color: '#8C5A35',
        fontFamily: 'PixelFont',
        marginBottom: 2,
    },
    recipeName: {
        fontSize: isTabletView ? 15 : 10,
        fontFamily: 'PixelFont',
        color: '#2D3748',
        marginBottom: 2,
    },
    caloriesText: {
        fontSize: isTabletView ? 12 : 8,
        color: '#718096',
        fontFamily: 'PixelFont'
    },
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        height: isTabletView ? 60 : 40,
        aspectRatio: 1
    },
    deleteButtonBg: {
        position: 'absolute',
        top: -10,     
        right: 0,   
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    emptyDayText: {
        color: '#A0AEC0',
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 12 : 10,
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
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 14 : 10,
    },

    // Footer
    footerWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    footerContainer: {
        paddingHorizontal: '5%',
        paddingTop: isTabletView ? '6%' : '8%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
    },
    // Input Section
    inputSection: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: isTabletView ? 14 : 12,
        fontFamily: 'PixelFont',
        color: '#4A2F1D',
        marginBottom: 6,
        marginLeft: 4,
    },
    inputWrapper: {
        height: isTabletView ? 60 : 50,
        width: '100%',
        justifyContent: 'center'
    },
    backgroundImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
    },
    inputContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        width: '100%',
        height: '100%',
        zIndex: 1,
    },
    pencilIcon: {
        height: isTabletView ? 30 : 20,
        width: isTabletView ? 30 : 20,
        marginHorizontal: 10,
    },
    textInput: {
        flex: 1,
        fontSize: isTabletView ? 16 : 14,
        color: '#2D3748',
        fontFamily: 'PixelFont',
        height: '100%',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },

    // Fridge Header Row
    fridgeHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8
    },
    fridgeLabel: {
        fontSize: isTabletView ? 14 : 12,
        color: '#5E8050',
        fontFamily: 'PixelFont'
    },

    // Chip Scroll
    pillContainer: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 0
    },
    pillWrapper: {
        width: isTabletView ? 200 : 150,
        height: isTabletView ? 60 : 40,
        justifyContent: 'space-between',
    },
    pillImageBackground: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4
    },
    chipText: {
        fontSize: isTabletView ? 10 : 8,
        color: '#555',
        fontFamily: 'PixelFont',
        textAlign: 'center',
        paddingHorizontal: 5
    },
    chipTextActive: {
        color: '#FFFFFF'
    },

    // Confirm Button
    confirmWoodButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        height: isTabletView ? 100 : 80,
        width: '100%',
        maxWidth: 400,
        borderRadius: 8,
        alignItems: 'center',
        alignSelf: 'center'
    },
    confirmButtonBackgroundImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#FFFFFF',
        paddingHorizontal: '5%',
        fontSize: isTabletView ? 16 : 12,
        textAlign: 'center',
        fontFamily: 'PixelFont'
    },

    // Custom Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBox: {
        backgroundColor: '#F3E8D6',
        borderWidth: 4,
        borderColor: '#4A2F1D',
        borderRadius: 8,
        padding: 24,
        width: '90%',
        maxWidth: 550,
        height: '50%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 20 : 16,
        color: '#4A2F1D',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalMessage: {
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 14 : 12,
        color: '#718096',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    modalOptionButton: {
        backgroundColor: '#E8EDE6', // Soft green from your refresh buttons
        borderWidth: 2,
        borderColor: '#4A2F1D',
        borderRadius: 8,
        width: '100%',
        paddingVertical: 14,
        marginBottom: 12,
        alignItems: 'center',
    },
    modalOptionText: {
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 16 : 14,
        color: '#4A2F1D',
    },
    closeModalButton: {
        marginTop: 20,
        backgroundColor: '#8C5A35',
        borderWidth: 2,
        borderColor: '#4A2F1D',
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 6,
        width: 200
    },
    closeModalButtonText: {
        fontFamily: 'PixelFont',
        color: '#FFFFFF',
        fontSize: 16,
        includeFontPadding: false,
        textAlignVertical: 'center'
    }

});