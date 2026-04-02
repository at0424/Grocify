import { getUserId } from '@/amplify/auth/authService';
import { fetchRecipes, fetchUserMealPlan, updateUserPlan } from '@/services/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Clock } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const FILTERS = ["Breakfast", "Lunch", "Dinner"];

export default function RecipesListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Initialize state based on what was passed (e.g., "Breakfast")
  const [selectedFilter, setSelectedFilter] = useState(params.type || "Breakfast");
  const [searchQuery, setSearchQuery] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch recipes when filter changes
  useEffect(() => {
    loadRecipes();
  }, [selectedFilter]);

  const loadRecipes = async () => {
    setLoading(true);
    const data = await fetchRecipes(selectedFilter);
    setRecipes(data);
    setLoading(false);
  };

  // Handle Selection (The "Return" Logic)
  const handleSelectRecipe = async (newRecipe) => {

    // If its for preview page, just update the preview list
    if (params.isDraft === 'true') {
      DeviceEventEmitter.emit('event.recipeSelected', newRecipe);
      router.back();
      return; 
    }

    try {
      setLoading(true);

      const targetDate = params.date;
      const mealType = params.type;
      const targetSlotId = params.slotId;

      if (!targetDate || !mealType) {
        Alert.alert("Error", "Missing date or meal type. Cannot swap.");
        setLoading(false);
        return;
      }

      const userId = await getUserId();

      // Fetch the user's current full meal plan
      const currentPlan = await fetchUserMealPlan(userId);

      if (!currentPlan || !currentPlan.planData) {
        Alert.alert("Error", "Could not find an active meal plan to update.");
        setLoading(false);
        return;
      }

      // Clone the plan data so we can modify it safely
      const updatedPlanData = [...currentPlan.planData];

      // Find the exact day we want to modify
      const dayIndex = updatedPlanData.findIndex(day => day.date === targetDate);
      
      if (dayIndex !== -1) {
        
        let mealIndex = -1;

        if (targetSlotId) {
            mealIndex = updatedPlanData[dayIndex].meals.findIndex(m => m.slotId === targetSlotId);
        } else {
            // Fallback to type matching just in case slotId is missing
            mealIndex = updatedPlanData[dayIndex].meals.findIndex(m => m.type === mealType);
        }
        
        if (mealIndex !== -1) {
          // SWAP THE RECIPE! Overwrite the old recipe with the newly selected one
          updatedPlanData[dayIndex].meals[mealIndex].recipe = newRecipe;
        } else {
          // Include a generated slotId if creating a fallback slot
          updatedPlanData[dayIndex].meals.push({ 
            slotId: `slot-${Date.now()}`, 
            type: mealType, 
            recipe: newRecipe, 
            consumed: false 
          });
        }
      }

      // Construct the exact payload your Lambda expects
      const payload = {
        userId: userId,
        planId: currentPlan.planId,
        endDate: currentPlan.endDate, 
        planData: updatedPlanData,    
        targetFridges: currentPlan.targetFridges || ['ALL']
      };

      // Send to backend
      const response = await updateUserPlan(payload);

      if (response && response.success) {
        router.dismissAll();
        router.push({ 
          pathname: './', 
          params: { refresh: Date.now() } 
        });
      } else {
        throw new Error("Backend failed to update the plan.");
      }

    } catch (error) {
      console.error("Failed to swap recipe:", error);
      Alert.alert("Error", "Could not update your meal plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Search Logic
  const filteredRecipes = recipes.filter(r => 
    r.mealName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
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

        <Text style={styles.headerTitle}>All Recipes</Text>

        {/* Spacer to keep title perfectly centered */}
        <View style={styles.backButton} />
      </ImageBackground>

      <View style={styles.content}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Image
            source={require('@/assets/images/listing/Magnifier.png')}
            style={styles.magnifierIcon}
            resizeMode="contain"
          />

          <TextInput
            placeholder="Search Recipe"
            placeholderTextColor={"#946744ff"}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((type) => (
            <TouchableOpacity 
              key={type}
              style={styles.pillWrapper}
              onPress={() => setSelectedFilter(type)}
            >
              <ImageBackground
                source={
                  selectedFilter === type
                    ? require('@/components/images/GeneralBlueButton.png')
                    : require('@/components/images/GeneralWoodenButton.png')
                }
                style={[styles.pillImageBackground]}
                resizeMode="stretch"
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === type && styles.filterTextActive
                ]}>
                  {type}
                </Text>
              </ImageBackground>
              
            </TouchableOpacity>
          ))}
        </View>

        {/* Recipe List */}
        {loading ? (
          <ActivityIndicator size="large" color="#7A9B6B" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredRecipes}
            keyExtractor={(item) => item.recipeId || item.mealName}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.recipeCard}
                onPress={() => handleSelectRecipe(item)}
              >
                {/* Image */}
                <ImageBackground
                  source={require('@/assets/images/listing/DetailBorder.png')}
                  style={styles.ingredientImageContainer}
                  resizeMode='stretch'
                >
                  <Image
                    source={{ uri: item.imageUrl || "https://placehold.co/150x150/png" }}
                    style={styles.cardImage}
                  />
                </ImageBackground>
                
                
                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.mealName}</Text>
                  <View style={styles.cardMetaRow}>
                    <Clock size={isTabletView ? 20 : 15} style={styles.clockIcon} color="#718096" />
                    <Text style={styles.cardMetaText}>~{item.prepTime} mins</Text>
                  </View>
                </View>

                {/* Arrow */}
                <ChevronRight size={24} color="#718096" />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6', 
    borderRadius: 8, 
    borderWidth: 2,
    borderColor: '#7A5B35', 
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  magnifierIcon: {
    width: isTabletView ? 30 : 24,
    height: isTabletView ? 30 : 24,
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    fontSize: isTabletView ? 16 : 12,
    fontFamily: 'PixelFont',
    color: '#4A3525',
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  pillWrapper: {
    width: '25%',
    height: isTabletView ? 50 : 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pillImageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  filterText: {
    fontSize: isTabletView ? 10 : 8,
    textAlign: 'center',
    color: '#555',
    fontFamily: 'PixelFont'
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  // List Cards
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDE6', // Light Green background
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  ingredientImageContainer: {
    width: isTabletView ? 80 : 60,
    height: isTabletView ? 80 : 60,
    borderRadius: 8,
    padding: isTabletView ? 10 : 5,
    marginRight: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain'
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: isTabletView ? 16 : 12,
    fontFamily: 'PixelFont',
    color: '#1A202C',
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMetaText: {
    fontSize: isTabletView ? 12 : 10,
    color: '#718096',
    fontFamily: 'PixelFont'
  },
});