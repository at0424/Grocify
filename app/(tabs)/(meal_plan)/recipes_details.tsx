import { fetchIngredientImageFromName } from '@/services/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BarChart3, ChefHat, Clock } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Define our header height constraints
const HEADER_MAX_HEIGHT = height * 0.4; // 40% of screen height
const HEADER_MIN_HEIGHT = 100; // Minimum height when scrolled (covers safe area + buttons)
const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

export default function RecipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [ingredientsWithImages, setIngredientsWithImages] = useState([]);
  
  // Track the scroll position
  const scrollY = useRef(new Animated.Value(0)).current;

  // Parse the recipe data passed from the previous screen
  const recipe = params.recipeData ? JSON.parse(params.recipeData) : null;

  useEffect(() => {
    const loadIngredientImages = async () => {
      if (!recipe?.ingredients) return;

      const updatedIngredients = await Promise.all(
        recipe.ingredients.map(async (ing) => {
          const fetchedImageUrl = await fetchIngredientImageFromName(ing.groceryName);
          
          return {
            ...ing,
            imageUrl: fetchedImageUrl 
          };
        })
      );

      // Save to state
      setIngredientsWithImages(updatedIngredients);
    };

    loadIngredientImages();
  }, [recipe]);
  
  if (!recipe) return null;

  const difficulty = recipe.difficulty || "Medium";
  const cuisine = recipe.cuisine || "Malaysian";
  const ingredientCount = recipe.ingredients ? recipe.ingredients.length : 0;
  const imageUrl = recipe.imageUrl || "https://placehold.co/600x400/png";
  const cookingSteps = recipe.steps || [];

  // Interpolate scroll position to calculate the shrinking height of the image
  const headerHeight = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      
      {/* --- ANIMATED HERO IMAGE --- */}
      <Animated.View style={[styles.heroImageContainer, { height: headerHeight }]}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.heroImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* --- FLOATING HEADER BUTTONS --- */}
      {/* Placed outside ScrollView so they always stay pinned to the top */}
      <SafeAreaView style={styles.floatingHeader} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image
              source={require('@/components/images/BackButton.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode='contain'
            />
          </TouchableOpacity>

          {/* Favourite Button (To be implement) */}
          {/* <TouchableOpacity style={styles.circleButton}>
            <Heart size={22} color="#FFFFFF" />
          </TouchableOpacity> */}
          
        </View>
      </SafeAreaView>

      {/* --- SCROLLABLE CONTENT --- */}
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16} // Captures scroll events smoothly
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false } // Required false because we are animating 'height'
        )}
      >
        {/* The White Content Sheet */}
        <View style={styles.sheetContainer}>
          
          {/* Title & Description */}
          <Text style={styles.title}>{recipe.mealName}</Text>
          <Text style={styles.description}>
            {recipe.description}
          </Text>

          {/* Stats Grid (3 Boxes) */}
          <View style={styles.statsRow}>
        
            <InfoCard 
              icon={<Clock size={isTabletView ? 36 : 28} color="#333" />} 
              label="Cooking Time" 
              value={`~${recipe.prepTime} mins`} 
            />
            <InfoCard 
              icon={<BarChart3 size={isTabletView ? 36 : 28} color="#333" />} 
              label="Difficulty" 
              value={difficulty} 
            />
            <InfoCard 
              icon={<ChefHat size={isTabletView ? 36 : 28} color="#333" />} 
              label="Cuisine" 
              value={cuisine} 
            />
          </View>

          {/* Ingredients Section */}
          <Text style={styles.sectionHeader}>Ingredients ({ingredientCount})</Text>
          
          <View style={styles.ingredientsList}>
            {ingredientsWithImages.map((ing, index) => {
              const imageSource = ing.imageUrl && ing.imageUrl.trim() !== ''
                ? { uri: ing.imageUrl }
                : require('@/assets/images/Apple.png');
              
              return (
                <View key={index} style={styles.ingredientRow}>
                  <ImageBackground 
                    source={require('@/assets/images/listing/DetailBorder.png')}
                    style={styles.ingredientImageContainer}
                    resizeMode='stretch'
                  >

                    {/* Ingredient Image */}
                    <Image
                      source={imageSource}
                      style={styles.ingredientImage}
                    />

                  </ImageBackground>

                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ing.groceryName}</Text>
                    <Text style={styles.ingredientAmount}>
                      {ing.amount} {ing.unit}
                    </Text>
                  </View>
                </View>
              );
              
            })}
          </View>

          {/* --- Cooking Steps Section --- */}
          <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Cooking Steps</Text>
          
          <ImageBackground
            source={require('@/assets/images/meal_plan/MealPlanFooter.png')} 
            style={styles.stepsContainer}
            imageStyle={styles.stepsContainerImage}
          >
            {cookingSteps && cookingSteps.length > 0 ? (
              cookingSteps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  {/* Step Number Box */}
                  <ImageBackground 
                    source={require('@/assets/images/meal_plan/RockContainer.png')} 
                    style={styles.stepNumberBox}
                    resizeMode="stretch"
                  >
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </ImageBackground>
                  
                  {/* Instruction Text */}
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.stepText}>No cooking instructions provided.</Text>
            )}
          </ImageBackground>

        </View>
      </Animated.ScrollView>

    </View>
  );
}

// --- HELPER COMPONENT: Info Card ---
const InfoCard = ({ icon, label, value }) => (
  <ImageBackground
    source={require('@/assets/images/meal_plan/RockContainer.png')}
    style={styles.infoCard}
    resizeMode='stretch'
  >
    <View style={styles.rockInnerContent}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.infoLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  </ImageBackground>
);

const isTabletView = width > 710;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3E8D6',
  },
  
  // --- Hero Image & Header Styles ---
  heroImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    overflow: 'hidden',
    backgroundColor: '#F4F1EA', 
    alignItems: 'center',     
    justifyContent: 'center',
  },
  heroImage: {
    width: '70%',
    height: '70%',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10, 
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  backButton: {
    height: isTabletView ? 50 : 35,
    aspectRatio: 1,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- Scroll & Sheet Styles ---
  scrollContent: {
    paddingTop: HEADER_MAX_HEIGHT, 
  },
  sheetContainer: {
    backgroundColor: '#FDF7EB',
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40,
    borderTopWidth: 4, 
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#C1A47A',
    padding: 24,
    marginTop: -40, 
    minHeight: height,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10, 
  },
  
  // --- Typography & Details (Same as yours) ---
  title: {
    fontSize: isTabletView ? 25 : 20,
    fontFamily: 'PixelFont',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  description: {
    fontSize: isTabletView ? 18 : 12,
    color: '#666666',
    fontFamily: 'PixelFont',
    lineHeight: 22,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  infoCard: {
    padding: '5%',
    alignItems: 'flex-start',
    width: width * 0.28,
    aspectRatio : 1,
  },
  rockInnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    width: '100%',
    height: '100%',
    paddingBottom: '20%'
  },
  iconCircle: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: isTabletView ? 14 : 9,
    fontFamily: 'PixelFont',
    color: '#6D4C41',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  infoValue: {
    fontSize: isTabletView ? 11 : 8,
    fontFamily: 'PixelFont',
    color: '#3E2723',
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  sectionHeader: {
    fontSize: isTabletView ? 20 : 14,
    fontFamily: 'PixelFont',
    color: '#1A1A1A',
    marginBottom: 16,
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDE6', 
    borderRadius: 12,
    padding: 12,
  },
  ingredientImageContainer: {
    width: isTabletView ? 80 : 60,
    height: isTabletView ? 80 : 60,
    borderRadius: 8,
    padding: isTabletView ? 10 : 5,
    marginRight: 16,
    overflow: 'hidden',
  },
  borderImage: {
    position: 'absolute'
  },
  ingredientImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain'
  },
  ingredientInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientName: {
    fontSize: isTabletView ? 16 : 12,
    fontFamily: 'PixelFont',
    color: '#2C3A26',
    maxWidth: '70%',
    includeFontPadding: false,
    textAlignVertical: 'center'
  },
  ingredientAmount: {
    fontSize: isTabletView ? 12 : 10,
    color: '#666666',
    fontFamily: 'PixelFont',
    includeFontPadding: false,
    textAlignVertical: 'center'
  },

  // --- Cooking Steps Styles ---
  stepsContainer: {
    padding: 24,
    marginTop: 8,
    minHeight: 200,
  },
  stepsContainerImage: {
    resizeMode: 'stretch',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumberBox: {
    width: isTabletView ? 40 : 32,
    height: isTabletView ? 40 : 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2, 
  },
  stepNumberText: {
    fontFamily: 'PixelFont',
    fontSize: isTabletView ? 16 : 14,
    color: '#3E2723',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  stepText: {
    flex: 1,
    fontFamily: 'PixelFont',
    fontSize: isTabletView ? 16 : 12,
    color: '#2C3A26', 
    lineHeight: isTabletView ? 24 : 18,
  },
});