import { getUserId } from '@/amplify/auth/authService';
import { deleteUserPlan, fetchFridgeItems, fetchUserLists, fetchUserMealPlan, markMealAsConsumed } from '@/services/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, Check, MoreVertical, RefreshCw, Utensils } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ImageBackground,
    Platform,
    RefreshControl,
    SafeAreaView,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function MealPlanScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [plan, setPlan] = useState(null);
    const [groupedMeals, setGroupedMeals] = useState([]);
    const [fridgeInventory, setFridgeInventory] = useState(new Set()); // Uses Set for fast lookup

    useEffect(() => {
        loadData();
    }, [params.refresh]);

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchPlan(), fetchInventory()]);
        setLoading(false);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchPlan(), fetchInventory()]);
        setRefreshing(false);
    }, []);

    // Fetch the Active Meal Plan and Auto-Clean Past Dates
    const fetchPlan = async () => {
        const currentUserId = await getUserId();
        const data = await fetchUserMealPlan(currentUserId);

        if (data && data.planData) {
            // Get today's date at exactly midnight
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Grab the official Start Date that we saved to AWS
            const planStartDate = new Date(data.startDate);

            // Filter out any days that are strictly BEFORE today
            const activeDays = data.planData.filter((day, index) => {

                // Calculate this exact day's date based on its position in the array
                // If index is 0 (Day 1), it adds 0 days. If index is 1 (Day 2), it adds 1 day.
                const dateObj = new Date(planStartDate);
                dateObj.setDate(planStartDate.getDate() + index);
                dateObj.setHours(0, 0, 0, 0);

                // Keep the day if it is Today or in the Future
                return dateObj >= today;
            });

            // AUTO-DELETE: If all days are in the past, the plan is over!
            if (activeDays.length === 0) {
                console.log("Meal plan has expired. Auto-deleting...");

                await deleteUserPlan(currentUserId, data.planId);

                // Clear the screen
                setPlan(null);
                setGroupedMeals([]);
                return;
            }

            // Update the local data to ONLY include active days
            data.planData = activeDays;

            setPlan(data);
            processPlanData(activeDays);
        } else {
            setPlan(null);
            setGroupedMeals([]);
        }
    };

    // Fetch Fridge Inventory (for the Warning Logic)
    const fetchInventory = async () => {
        try {
            const userId = await getUserId();
            if (!userId) return;

            // Get all user lists
            const lists = await fetchUserLists(userId);
            if (!lists || lists.length === 0) return;

            // Fetch items from ALL lists in parallel
            const promises = lists.map(list => fetchFridgeItems(list.listId));
            const results = await Promise.all(promises);

            // Combine into a Set of lowercase names for easy matching
            const inventorySet = new Set();
            results.forEach(res => {
                const items = res.items || res.data || [];
                items.forEach(item => {
                    if (item.name) inventorySet.add(item.name.toLowerCase().trim());
                });
            });

            setFridgeInventory(inventorySet);
        } catch (error) {
            console.error("Failed to load inventory:", error);
        }
    };

    // Process Dates into Sections (Today, Tomorrow, etc.)
    const processPlanData = (daysArray) => {
        if (!daysArray) return;

        // Sort by date
        const sortedDays = [...daysArray].sort((a, b) => new Date(a.date) - new Date(b.date));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sections = sortedDays.map(day => {
            const dateObj = new Date(day.date);
            dateObj.setHours(0, 0, 0, 0);

            const diffTime = dateObj - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let title = "";
            if (diffDays === 0) title = "Today";
            else if (diffDays === 1) title = "Tomorrow";
            else title = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

            return {
                title: title,
                data: day.meals.filter(m => m.recipe), // Only show slots with recipes
                date: day.date,
                isPastOrToday: diffDays <= 0
            };
        }).filter(section => section.data.length > 0); // Remove empty days

        setGroupedMeals(sections);
    };

    // Handle More Actions (Create New, Delete)
    const showActionMenu = () => {
        const options = ['Create New Plan', 'Delete Current Plan', 'Cancel'];
        const destructiveButtonIndex = 1;
        const cancelButtonIndex = 2;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    destructiveButtonIndex,
                    cancelButtonIndex,
                    tintColor: '#7A9B6B'
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) handleCreateNew();
                    if (buttonIndex === 1) confirmDelete();
                }
            );
        } else {
            // Android Alert
            Alert.alert(
                "Meal Plan Options",
                "Choose an action",
                [
                    { text: "Create New Plan", onPress: handleCreateNew },
                    { text: "Delete Plan", onPress: confirmDelete, style: 'destructive' },
                    { text: "Cancel", style: "cancel" }
                ]
            );
        }
    };

    // Navigate to Date Page to Create New Plan
    const handleCreateNew = () => {
        router.push('/dates');
    };

    // Delete Plan with Confirmation
    const confirmDelete = () => {
        Alert.alert(
            "Delete Plan?",
            "This will remove your current meal schedule. You cannot undo this.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        const userId = await getUserId();
                        if (plan && plan.planId) {
                            await deleteUserPlan(userId, plan.planId);
                            // Refresh local state to show empty view
                            setPlan(null);
                            setGroupedMeals([]);
                        }
                        setLoading(false);
                    }
                }
            ]
        );
    };

    // Handle Consume Meal
    const handleConsumeMeal = (date, mealType, recipe) => {
        Alert.alert(
            "Consume Meal?",
            `This will mark ${recipe.mealName} as eaten and remove its ingredients from your associated fridge.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Consume",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const userId = await getUserId();
                            const targetFridges = plan.targetFridges || ['ALL'];

                            // Send request to backend
                            const result = await markMealAsConsumed(
                                userId,
                                plan.planId,
                                date,
                                mealType,
                                recipe.ingredients,
                                targetFridges
                            );

                            console.log("SERVER SAID:", result);

                            if (result && result.success) {
                                // Optimistic Update: Update the local plan state
                                const updatedPlan = { ...plan };
                                const dayIndex = updatedPlan.planData.findIndex(d => d.date === date);

                                if (dayIndex !== -1) {
                                    const mealIndex = updatedPlan.planData[dayIndex].meals.findIndex(m => m.type === mealType);
                                    if (mealIndex !== -1) {
                                        updatedPlan.planData[dayIndex].meals[mealIndex].consumed = true;
                                    }
                                }

                                setPlan(updatedPlan);
                                processPlanData(updatedPlan.planData);

                                // Refetch inventory to clear the warning badges instantly
                                await fetchInventory();
                            } else {
                                throw new Error("Backend failed to update");
                            }
                        } catch (e) {
                            console.error("Consume Error:", e);
                            Alert.alert("Error", "Failed to consume meal.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Swap Recipe for a Meal Slot
    const handleSwap = (date, type) => {
        router.push({
            pathname: '/recipes_list',
            params: { type: type }
        });
    };

    // Navigate to Recipe Details Page
    const goToDetails = (recipe) => {
        router.push({
            pathname: '/recipes_details',
            params: { recipeData: JSON.stringify(recipe) }
        });
    };

    // Check if any ingredient is missing for the recipes
    const hasMissingIngredients = (recipe) => {
        if (!recipe || !recipe.ingredients) return false;
        return recipe.ingredients.some(ing => {
            return !fridgeInventory.has(ing.groceryName.toLowerCase().trim());
        });
    };

    // Returns list of missing ingredient for specific recipe
    const getMissingItems = (recipe) => {
        if (!recipe || !recipe.ingredients) return [];
        return recipe.ingredients
            .filter(ing => !fridgeInventory.has(ing.groceryName.toLowerCase().trim()))
            .map(ing => ing.groceryName);
    };

    // Loading Screen
    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#7A9B6B" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>

            {/* --- CUSTOM BACKGROUND --- */}
            <View style={styles.backgroundContainer}>
                {[1, 2, 3, 4, 5].map((_, index) => (
                    <Image
                        key={index}
                        source={require('@/assets/images/listing/WoodenPanel.png')}
                        style={styles.panelImage}
                        resizeMode='stretch'
                    />
                ))}
            </View>
            
            {/* Darken Effect */}
            <View style={styles.darkOverlay} />


            {/* Header */}
            <ImageBackground
                source={require('@/assets/images/meal_plan/MealPlanHeader.png')}
                style={styles.header}
                resizeMode='stretch'
            >
                <TouchableOpacity
                    onPress={() => {
                        router.push('../');
                    }}
                    style={styles.backButton}
                >
                    <Image
                        source={require('@/components/images/BackButton.png')}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode='contain'
                    />

                </TouchableOpacity>

                <Text style={styles.headerTitle}>Meal Plan</Text>

                {/* Action Button (Only show if plan exists) */}
                {plan ? (
                    <TouchableOpacity onPress={showActionMenu} style={styles.actionButton}>
                        <MoreVertical color="#FFFFFF" size={24} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 28 }} />
                )}
            </ImageBackground>

            {/* List */}
            <SectionList
                sections={groupedMeals}
                keyExtractor={(item, index) => item.type + index}
                style={{ width: '100%', height: '100%' }}
                contentContainerStyle={{ padding: 20, paddingBottom: 100, height: '100%' }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7A9B6B" />
                }
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionHeader}>{title}</Text>
                )}
                renderItem={({ item, section }) => {
                    const showWarning = hasMissingIngredients(item.recipe);

                    return (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => goToDetails(item.recipe)}
                            activeOpacity={0.7}
                        >
                            {/* Left: Icon or Image */}
                            <View style={styles.iconContainer}>
                                {item.recipe && item.recipe.image ? (
                                    <Image
                                        source={{ uri: item.recipe.image }}
                                        style={styles.foodImage}
                                    />
                                ) : (
                                    <View style={styles.placeholderIcon}>
                                        <Utensils size={24} color="#7A9B6B" />
                                    </View>
                                )}

                                {/* "!" Warning Badge */}
                                {showWarning && (
                                    <TouchableOpacity
                                        style={styles.warningBadge}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        onPress={(e) => {
                                            e.stopPropagation();

                                            const missing = getMissingItems(item.recipe);

                                            Alert.alert(
                                                `Missing for ${item.recipe.mealName}`,
                                                `• ` + missing.join(`\n• `),
                                                [{ text: "OK" }]
                                            );
                                        }}
                                    >
                                        <AlertTriangle size={12} color="#856404" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Middle: Text */}
                            <View style={styles.textContainer}>
                                <Text style={styles.mealType}>{item.type}</Text>
                                <Text style={styles.mealName} numberOfLines={1}>
                                    {item.recipe ? item.recipe.mealName : "No Recipe"}
                                </Text>
                            </View>

                            {/* Right: Edit Button (Only for Future Days) */}
                            {section.isPastOrToday ? (
                                <TouchableOpacity
                                    style={[styles.editButton, item.consumed && styles.consumedButton]}
                                    onPress={() => {
                                        if (!item.consumed) handleConsumeMeal(section.date, item.type, item.recipe);
                                    }}
                                    disabled={item.consumed}
                                >
                                    <Check size={16} color={item.consumed ? "#FFFFFF" : "#7A9B6B"} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => handleSwap(section.date, item.type)}
                                >
                                    <RefreshCw size={16} color="#7A9B6B" />
                                </TouchableOpacity>
                            )}

                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>

                        <ImageBackground
                            source={require('@/assets/images/meal_plan/EmptyStateDeco.png')}
                            style={styles.emptyDecoStyle}
                            resizeMode='contain'
                        >
                            <Text style={styles.emptyText}>No meal plan active.</Text>
                        </ImageBackground>

                        <TouchableOpacity onPress={() => router.push('/dates')} style={styles.createButton}>
                            <ImageBackground
                                source={require('@/assets/images/freshness/GreenButton.png')}
                                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                                resizeMode='stretch'
                            >
                                <Text style={styles.createButtonText}>Create Plan</Text>
                            </ImageBackground>

                        </TouchableOpacity>
                    </View>
                }
            />

        </SafeAreaView>
    );
}

const { width, height } = Dimensions.get('window');
const isTabletView = width > 710;

const styles = StyleSheet.create({
    
    // ==============================
    // CONTAINER 
    // ==============================
    container: {
        flex: 1,
        backgroundColor: '#603c24ff',
        zIndex: -2
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backgroundContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
    },
    panelImage: {
        width: "100%",
        height: '20%',
    },
    darkOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },

    // ==============================
    // HEADER
    // ==============================
    header: {
        height: isTabletView ? 100 : 70,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: isTabletView ? 20 : 18,
        fontFamily: 'PixelFont',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },
    backButton: {
        height: isTabletView ? 50 : 35,
        aspectRatio: 1
    },

    // ==============================
    // EMPTY STATE
    // ==============================
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        height: '100%',
        width: '100%',
        paddingBottom: '20%'
    },
    emptyDecoStyle: {
        width: isTabletView ? 600 : 320,  
        height: isTabletView ? 400 : 220, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginBottom: 10,
    },
    emptyText:{
        color: '#4A3424',
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 14 : 10,
        textAlign: 'center',
        paddingHorizontal: '20%',
        top: '15%'
    },
    createButton: {
        height: '10%',
        width: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    createButtonText: {
        color: '#FFFFFF',
        textAlign: 'center',
        paddingHorizontal: 5,
        fontSize: isTabletView ? 20 : 16,
        fontFamily: 'PixelFont',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },

    // ==============================
    // LIST 
    // ==============================
    sectionHeader: {
        fontSize: 15,
        color: '#666666',
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 10,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: 'transparent', // Cards look transparent in screenshot or white
    },

    // ==============================
    // ICON / IMAGE
    // ==============================
    iconContainer: {
        position: 'relative',
        marginRight: 16,
    },
    foodImage: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#E8EDE6',
    },
    placeholderIcon: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#DCFCE7', // Very light green background
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },

    // Warning Badge Logic
    warningBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FCD34D',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    },

    // Text Area
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    mealType: {
        fontSize: 15,
        fontWeight: '700',
        color: '#4B5563', // Dark Grey
        marginBottom: 2,
    },
    mealName: {
        fontSize: 14,
        color: '#6B7280', // Lighter Grey
    },

    // ==============================
    // EDIT BUTTON
    // ==============================
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#DCFCE7', // Light green circle
        justifyContent: 'center',
        alignItems: 'center',
    },
    consumedButton: {
        backgroundColor: '#7A9B6B', // Turns dark green when consumed
        opacity: 0.8,
    },
});