import { getUserId } from '@/amplify/auth/authService';
import { createUserPlan, fetchRecipes, fetchUserLists } from '@/services/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, Moon, RefreshCw, Snowflake, Sun, Utensils } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
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
                    dayPlan.meals.push({
                        type: 'Breakfast',
                        recipe: getRandomRecipe(bfList)
                    });
                }
                if (daySelection.lunch) {
                    dayPlan.meals.push({
                        type: 'Lunch',
                        recipe: getRandomRecipe(lnList)
                    });
                }
                if (daySelection.dinner) {
                    dayPlan.meals.push({
                        type: 'Dinner',
                        recipe: getRandomRecipe(dnList)
                    });
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
                                if (meal.type === swappingSlot.type) {
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
    const handleSwap = (dateKey, mealType) => {
        // Remember which slot we are editing
        setSwappingSlot({ date: dateKey, type: mealType });

        router.push({
            pathname: '/recipes_list',
            params: { type: mealType }
        });
    };

    // Handle create meal plan
    const handleCreatePlan = async () => {
        setSaving(true);
        const currentUser = await getUserId();

        try {
            const payload = {
                userId: currentUser,
                startDate: params.start, 
                endDate: params.end,
                days: plan,
                targetFridges: [selectedFridgeId]
            };

            console.log("Saving Plan...", payload);

            await createUserPlan(payload);

            router.dismissAll();
            router.replace({
                pathname: '/(tabs)/(meal_plan)',
                params: { refresh: 'true' }
            });

        } catch (error) {
            Alert.alert("Error", "Could not save your meal plan. Please try again.");
        } finally {
            setLoading(false);
        }
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
                                    key={`${day.date}-${meal.type}`}
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
                                        onPress={() => handleSwap(day.date, meal.type)}
                                    >
                                        <RefreshCw size={18} color="#7A9B6B" />
                                    </TouchableOpacity>

                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Footer */}        
        {/* Label */}
        <View style={styles.footerContainer}>
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
                        {selectedFridgeId === 'ALL' && <CheckCircle2 size={14} color="#FFF" style={{marginLeft: 4}} />}
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
                                {isSelected && <CheckCircle2 size={14} color="#FFF" style={{marginLeft: 4}} />}
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

    // Footer
    footerContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 40,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20,
    },
    fridgeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    fridgeLabel: { fontSize: 14, color: '#5E8050', fontWeight: '600' },
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
    confirmButton: { backgroundColor: '#7A9B6B', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    
});