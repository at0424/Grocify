import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BarChart3, ChefHat, ChevronLeft, Clock, Heart } from 'lucide-react-native';
import React from 'react';
import {
    Dimensions,
    Image,
    ImageBackground,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function RecipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 1. Parse the recipe data passed from the previous screen
  const recipe = params.recipeData ? JSON.parse(params.recipeData) : null;

  if (!recipe) return null;

  // Mock data for fields we might not have in DB yet (to match your UI)
  const difficulty = recipe.difficulty || "Medium";
  const cuisine = recipe.cuisine || "Malaysian";
  const ingredientCount = recipe.ingredients ? recipe.ingredients.length : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* --- HERO IMAGE BACKGROUND --- */}
      <ImageBackground 
        source={{ uri: "https://placehold.co/600x400/png" }} // Replace with recipe.image_url later
        style={styles.heroImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeAreaHeader}>
          {/* Header Buttons */}
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.circleButton} 
              onPress={() => router.back()}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.circleButton}>
              <Heart size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* --- CONTENT CONTAINER (White Sheet) --- */}
      <View style={styles.contentContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Title & Description */}
          <Text style={styles.title}>{recipe.mealName}</Text>
          <Text style={styles.description}>
            {recipe.description}
          </Text>

          {/* Stats Grid (3 Boxes) */}
          <View style={styles.statsRow}>
            <InfoCard 
              icon={<Clock size={20} color="#333" />} 
              label="Cooking Time" 
              value={`~ ${recipe.prepTime} mins`} 
            />
            <InfoCard 
              icon={<BarChart3 size={20} color="#333" />} 
              label="Difficulty" 
              value={difficulty} 
            />
            <InfoCard 
              icon={<ChefHat size={20} color="#333" />} 
              label="Cuisine" 
              value={cuisine} 
            />
          </View>

          {/* Ingredients Section */}
          <Text style={styles.sectionHeader}>Ingredients ({ingredientCount})</Text>
          
          <View style={styles.ingredientsList}>
            {recipe.ingredients.map((ing, index) => (
              <View key={index} style={styles.ingredientRow}>
                {/* Ingredient Image Placeholder */}
                <View style={styles.ingredientImageContainer}>
                  {/* Using a generic image or icon if you don't have ingredient photos yet */}
                  <Image 
                    source={{ uri: 'https://placehold.co/100x100/png' }} 
                    style={styles.ingredientImage} 
                  />
                </View>
                
                {/* Name & Quantity */}
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{ing.groceryName}</Text>
                  <Text style={styles.ingredientAmount}>
                    {ing.amount} {ing.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>

        {/* --- BOTTOM FLOATING BUTTON --- */}
        <View style={styles.footerContainer}>
          <TouchableOpacity style={styles.addButton} onPress={() => console.log("Added!")}>
            <Text style={styles.addButtonText}>Add to Plan</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

// --- HELPER COMPONENT: Info Card ---
const InfoCard = ({ icon, label, value }) => (
  <View style={styles.infoCard}>
    <View style={styles.iconCircle}>
      {icon}
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Hero Image
  heroImage: {
    width: '100%',
    height: 300, 
    justifyContent: 'flex-start',
  },
  safeAreaHeader: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)', // Semi-transparent black
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main Content Sheet
  contentContainer: {
    flex: 1,
    marginTop: -40, // Pull up over the image
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100, // Space for footer button
  },
  
  // Typography
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 24,
  },

  // Stats Grid
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDE6',
    borderRadius: 16,
    padding: 12,
    alignItems: 'flex-start',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8E8E8E',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3A26',
  },

  // Ingredients
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDE6', // Light Green Background from design
    borderRadius: 12,
    padding: 12,
  },
  ingredientImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginRight: 16,
    overflow: 'hidden',
  },
  ingredientImage: {
    width: '100%',
    height: '100%',
  },
  ingredientInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3A26',
  },
  ingredientAmount: {
    fontSize: 15,
    color: '#666666',
  },

  // Footer Button
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'transparent', 
  },
  addButton: {
    backgroundColor: '#5E8050', // Dark Sage Green
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#5E8050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});