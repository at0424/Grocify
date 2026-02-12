import { fetchRecipes } from '@/services/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Moon, RefreshCw, Sun, Utensils } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    const [plan, setPlan] = useState([]);
    const [recipePool, setRecipePool] = useState({});

    // Initialization
    useEffect(() => {
        generateInitialPlan();
    }, []);

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

    // Pick Random Recipe 
    const getRandomRecipe = (list) => {
        if (!list || list.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * list.length);
        return list[randomIndex];
    };

    // Swap Recipe
    const handleSwap = (dateKey, mealType) => {
        // Get the list of available recipes for this type
        const list = recipePool[mealType];
        if (!list) return;

        // Pick a NEW random one
        const newRecipe = getRandomRecipe(list);

        // Update State
        setPlan(currentPlan => {
            return currentPlan.map(day => {
                if (day.date === dateKey) {
                    // Found the day, now update the specific meal in the 'meals' array
                    const updatedMeals = day.meals.map(meal => {
                        if (meal.type === mealType) {
                            return { ...meal, recipe: newRecipe };
                        }
                        return meal;
                    });
                    return { ...day, meals: updatedMeals };
                }
                return day;
            });
        });
    };

    // Handle create meal plan
    const handleCreatePlan = () => {
        // Here you would typically POST the 'plan' object to your DynamoDB 'UserPlans' table
        console.log("Final Plan Confirmed:", JSON.stringify(plan, null, 2));

        // For now, navigate to the Dashboard (Screen 5)
        // We pass the plan data so the dashboard can render it
        router.push({
            pathname: '/dashboard', // You need to create this file next!
            params: { planData: JSON.stringify(plan) }
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
                                    key={`${day.date}-${meal.type}`}
                                    style={styles.mealCard}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        // 1. Check if recipe exists
                                        if (!meal.recipe) return;

                                        // 2. Navigate to Details Page
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
                                        onPress={(e) => {
                                            // Stop propagation isn't strictly needed in RN if handling separate touchables,
                                            // but keeping it distinct helps logic.
                                            handleSwap(day.date, meal.type);
                                        }}
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
            <View style={styles.footer}>
                <TouchableOpacity style={styles.confirmButton} onPress={handleCreatePlan}>
                    <Text style={styles.confirmButtonText}>Create Meal Plan</Text>
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
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 40,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    confirmButton: {
        backgroundColor: '#7A9B6B',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#7A9B6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});