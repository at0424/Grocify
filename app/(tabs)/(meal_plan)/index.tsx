import { getUserId } from '@/amplify/auth/authService';
import { PixelAlert } from '@/components/PixelAlert';
import { deleteUserPlan, fetchFridgeItems, fetchUserLists, fetchUserMealPlan, markMealAsConsumed } from '@/services/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, MoreVertical, Utensils } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ImageBackground,
    RefreshControl,
    SafeAreaView,
    ScrollView,
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
    const [fridgeInventory, setFridgeInventory] = useState(new Set());

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message?: string;
        items?: string[];
        showCancel?: boolean;
        confirmText?: string;
        onConfirm?: () => void;
        secondaryActionText?: string;
        onSecondaryAction?: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        items: [],
        showCancel: false,
        confirmText: 'OK',
    });

    const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

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
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const planStartDate = new Date(data.startDate);

            const activeDays = data.planData.filter((day, index) => {
                const dateObj = new Date(planStartDate);
                dateObj.setDate(planStartDate.getDate() + index);
                dateObj.setHours(0, 0, 0, 0);
                return dateObj >= today;
            });

            if (activeDays.length === 0) {
                console.log("Meal plan has expired. Auto-deleting...");
                await deleteUserPlan(currentUserId, data.planId);
                setPlan(null);
                setGroupedMeals([]);
                return;
            }

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

            const lists = await fetchUserLists(userId);
            if (!lists || lists.length === 0) return;

            const promises = lists.map(list => fetchFridgeItems(list.listId));
            const results = await Promise.all(promises);

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
                data: day.meals.filter(m => m.recipe),
                date: day.date,
                isPastOrToday: diffDays <= 0
            };
        }).filter(section => section.data.length > 0);

        setGroupedMeals(sections);
    };

    // Handle More Actions 
    const showActionMenu = () => {
        setAlertConfig({
            visible: true,
            title: "Meal Plan Options",
            message: "What would you like to do?",
            items: [],
            showCancel: false,

            // Left Button (Green)
            confirmText: "Create New Plan",
            onConfirm: () => {
                closeAlert();
                handleCreateNew();
            },

            // Right Button (Wood)
            secondaryActionText: "Delete Current Plan",
            onSecondaryAction: () => {
                closeAlert();
                confirmDelete();
            }
        });
    };

    const handleCreateNew = () => router.push('/dates');

    const confirmDelete = () => {
        setAlertConfig({
            visible: true,
            title: "Delete Plan?",
            message: "This will remove your current meal schedule. You cannot undo this.",
            items: [],
            showCancel: true,
            confirmText: "Delete",
            onConfirm: async () => {
                closeAlert();
                setLoading(true);
                const userId = await getUserId();
                if (plan && plan.planId) {
                    await deleteUserPlan(userId, plan.planId);
                    setPlan(null);
                    setGroupedMeals([]);
                }
                setLoading(false);
            }
        });
    };

    // Handle Consume Meal
    const handleConsumeMeal = (date, mealType, recipe) => {
        setAlertConfig({
            visible: true,
            title: "Consume Meal?",
            message: `This will mark ${recipe.mealName} as eaten and remove its ingredients from your associated fridge.`,
            items: [],
            showCancel: true,
            confirmText: "Consume",
            onConfirm: async () => {
                closeAlert();
                try {
                    setLoading(true);
                    const userId = await getUserId();
                    const targetFridges = plan.targetFridges || ['ALL'];

                    const result = await markMealAsConsumed(userId, plan.planId, date, mealType, recipe.ingredients, targetFridges);

                    if (result && result.success) {
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
                        await fetchInventory();
                    } else {
                        throw new Error("Backend failed to update");
                    }
                } catch (e) {
                    console.error("Consume Error:", e);
                    Alert.alert("Failed to consume meal.");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleSwap = (date, type) => {
        router.push({ pathname: '/recipes_list', params: { type: type, date: date } });
    };

    const goToDetails = (recipe) => {
        router.push({ pathname: '/recipes_details', params: { recipeData: JSON.stringify(recipe) } });
    };

    const hasMissingIngredients = (recipe) => {
        if (!recipe || !recipe.ingredients) return false;
        return recipe.ingredients.some(ing => !fridgeInventory.has(ing.groceryName.toLowerCase().trim()));
    };

    const getMissingItems = (recipe) => {
        if (!recipe || !recipe.ingredients) return [];
        return recipe.ingredients
            .filter(ing => !fridgeInventory.has(ing.groceryName.toLowerCase().trim()))
            .map(ing => ing.groceryName);
    };

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
            <View style={styles.darkOverlay} />


            {/* Header */}
            <ImageBackground
                source={require('@/assets/images/meal_plan/MealPlanHeader.png')}
                style={styles.header}
                resizeMode='stretch'
            >
                <TouchableOpacity onPress={() => router.push('../')} style={styles.backButton}>
                    <Image
                        source={require('@/components/images/BackButton.png')}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode='contain'
                    />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Meal Plan</Text>

                {plan ? (
                    <TouchableOpacity onPress={showActionMenu} style={styles.actionButton}>
                        <MoreVertical color="#FFFFFF" size={24} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 28 }} />
                )}
            </ImageBackground>

            {/* Replaced SectionList with ScrollView for better Pixel Art Wrapping */}
            <ScrollView
                style={{ width: '100%', height: '100%' }}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7A9B6B" />}
            >
                {/* EMPTY STATE */}
                {!groupedMeals || groupedMeals.length === 0 ? (
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
                ) : (
                    /* POPULATED MEAL PLAN LIST */
                    groupedMeals.map((section, sectionIndex) => (
                        <View key={section.date} style={styles.sectionWrapper}>

                            {/* The Decorative Fabric Image (Positioned behind content) */}
                            <Image
                                source={require('@/assets/images/meal_plan/MealPlanFooter.png')}
                                style={styles.fabricImageLayer}
                                resizeMode='stretch'
                            />

                            {/* The Content Layer (Sitting on top of the image) */}
                            <View style={styles.fabricContentContainer}>
                                {section.data.map((item, itemIndex) => {
                                    const showWarning = hasMissingIngredients(item.recipe);

                                    return (
                                        <TouchableOpacity
                                            key={item.slotId || itemIndex}
                                            style={[
                                                styles.mealCard,
                                                itemIndex !== section.data.length - 1 && styles.mealCardDivider
                                            ]}
                                            onPress={() => goToDetails(item.recipe)}
                                            activeOpacity={0.7}
                                        >
                                            {/* Left: Pixel Art Box for Food */}
                                            <View style={styles.recipeImageBox}>
                                                {item.recipe && item.recipe.imageUrl ? (
                                                    <Image
                                                        source={{ uri: item.recipe.imageUrl }}
                                                        style={styles.foodImage}
                                                    />
                                                ) : (
                                                    <View style={styles.placeholderIcon}>
                                                        <Utensils size={20} color="#7A9B6B" />
                                                    </View>
                                                )}

                                                {showWarning && (
                                                    <TouchableOpacity
                                                        style={styles.warningBadge}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            const missing = getMissingItems(item.recipe);

                                                            // Trigger the custom Pixel Art alert!
                                                            setAlertConfig({
                                                                visible: true,
                                                                title: "Missing items",
                                                                message: "",
                                                                items: missing,
                                                                showCancel: false,
                                                                confirmText: "OK",
                                                                onConfirm: closeAlert
                                                            });
                                                        }}
                                                    >
                                                        <AlertTriangle size={12} color="#4A2F1D" strokeWidth={3} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>

                                            {/* Middle: Text Info */}
                                            <View style={styles.textContainer}>
                                                <Text style={styles.mealType}>
                                                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                                </Text>
                                                <Text style={styles.mealName} numberOfLines={2}>
                                                    {item.recipe ? item.recipe.mealName : "No Recipe"}
                                                </Text>
                                            </View>

                                            {/* Right: Wood Square Button */}
                                            <TouchableOpacity
                                                style={styles.squareWoodButton}
                                                onPress={(e) => {
                                                    e.stopPropagation();

                                                    if (section.isPastOrToday) {
                                                        if (!item.consumed && item.recipe) {
                                                            handleConsumeMeal(section.date, item.type, item.recipe);
                                                        }
                                                    } else {
                                                        handleSwap(section.date, item.type);
                                                    }
                                                }}
                                            >
                                                {section.isPastOrToday ? (
                                                    item.consumed ? (
                                                        // EATEN: Show the Checkmark
                                                        <ImageBackground
                                                            source={require('@/components/images/Checkedbox.png')}
                                                            style={styles.squareButtonBg}
                                                            resizeMode="stretch"
                                                        />
                                                    ) : (
                                                        // NOT EATEN YET: Show an empty stone box
                                                        <ImageBackground
                                                            source={require('@/components/images/Checkbox.png')}
                                                            style={styles.squareButtonBg}
                                                            resizeMode="stretch"
                                                        />
                                                    )
                                                ) : (
                                                    // FUTURE: Show Swap Button
                                                    <ImageBackground
                                                        source={require('@/components/images/RefreshButton.png')}
                                                        style={styles.squareButtonBg}
                                                        resizeMode="stretch"
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* 3The Wooden Label Header */}
                            <View style={styles.sectionHeaderContainer}>
                                <ImageBackground
                                    source={require('@/assets/images/meal_plan/MealLabel.png')}
                                    style={styles.sectionLabelBg}
                                    resizeMode="stretch"
                                >
                                    <Text style={styles.sectionLabelText}>
                                        {section.title.replace(',', '\n')}
                                    </Text>
                                </ImageBackground>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <PixelAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                items={alertConfig.items}
                showCancel={alertConfig.showCancel}
                confirmText={alertConfig.confirmText}
                onConfirm={alertConfig.onConfirm}
                secondaryActionText={alertConfig.secondaryActionText}
                onSecondaryAction={alertConfig.onSecondaryAction}
                onClose={closeAlert}
            />

        </SafeAreaView>
    );
}

const { width } = Dimensions.get('window');
const isTabletView = width > 710;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#603c24ff', zIndex: -2 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Backgrounds
    backgroundContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 },
    panelImage: { width: "100%", height: '20%' },
    darkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)' },

    // Header
    header: { height: isTabletView ? 100 : 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    headerTitle: { color: '#FFFFFF', fontSize: isTabletView ? 20 : 18, fontFamily: 'PixelFont', includeFontPadding: false, textAlignVertical: 'center' },
    backButton: { height: isTabletView ? 50 : 35, aspectRatio: 1 },
    actionButton: { padding: 8 },

    // Empty State
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, height: '100%', width: '100%', paddingBottom: '20%' },
    emptyDecoStyle: { width: isTabletView ? 600 : 320, height: isTabletView ? 400 : 220, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    emptyText: { color: '#4A3424', fontFamily: 'PixelFont', fontSize: isTabletView ? 14 : 10, textAlign: 'center', paddingHorizontal: '20%', top: '15%' },
    createButton: { height: isTabletView ? 80 : 50, width: isTabletView ? 240 : 160, alignItems: 'center', justifyContent: 'center' },
    createButtonText: { color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 5, fontSize: isTabletView ? 20 : 16, fontFamily: 'PixelFont', includeFontPadding: false, textAlignVertical: 'center' },

    // ==============================
    // PIXEL ART LIST SECTIONS
    // ==============================
    sectionWrapper: {
        marginTop: 30, // Pushes the fabric down to make room for the floating wooden sign
        marginBottom: 20,
        position: 'relative',
    },
    fabricImageLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
    },
    fabricContentContainer: {
        paddingTop: 35,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    sectionHeaderContainer: {
        position: 'absolute',
        top: -25,
        alignSelf: 'center',
        zIndex: 10,
    },
    sectionLabelBg: {
        height: isTabletView ? 60 : 45,
        width: isTabletView ? 240 : 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionLabelText: {
        fontFamily: 'PixelFont',
        color: '#FFFFFF', // Or #4A2F1D if you prefer dark text on the wood
        fontSize: isTabletView ? 16 : 12,
        textAlign: 'center',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },

    // Meal Cards
    mealCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: '5%'
    },
    mealCardDivider: {
        borderBottomWidth: 2,
        borderBottomColor: '#D1C4A5', // Soft dashed/pixel line color between items
    },

    // Pixel Image Box
    recipeImageBox: {
        height: isTabletView ? 100 : 70,
        aspectRatio: 1,
        borderRadius: 8,
        backgroundColor: '#E4D5B7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: isTabletView ? 4 : 2,
        borderColor: '#4A2F1D',
        position: 'relative',
    },
    foodImage: {
        width: '100%',
        height: '100%',
        borderRadius: 2,
        resizeMode: 'contain'
    },
    placeholderIcon: {
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Warning Badge
    warningBadge: {
        position: 'absolute',
        top: -8,
        left: -8,
        backgroundColor: '#FCD34D',
        borderWidth: 2,
        borderColor: '#4A2F1D',
        width: isTabletView ? 30 : 22,
        height: isTabletView ? 30 : 22,
        borderRadius: 4,
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
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 16 : 14,
        color: '#4A2F1D',
        marginBottom: 4,
    },
    mealName: {
        fontFamily: 'PixelFont',
        fontSize: isTabletView ? 14 : 11,
        color: '#718096',
    },

    // Wood Action Buttons
    squareWoodButton: {
        height: isTabletView ? 55 : 45,
        width: isTabletView ? 75 : 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    squareButtonBg: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCheckbox: {
        width: 14,
        height: 14,
        backgroundColor: 'rgba(0,0,0,0.1)', // Subtle inset look for unconsumed items
        borderRadius: 2,
    },
    swapText: {
        fontFamily: 'PixelFont',
        color: '#FFFFFF',
        fontSize: isTabletView ? 14 : 10,
        includeFontPadding: false,
        textAlignVertical: 'center',
    }
});