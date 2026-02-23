import { fetchRecipes } from '@/services/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Clock, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    DeviceEventEmitter,
    FlatList,
    Image,
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
  
  // 1. Initialize state based on what was passed (e.g., "Breakfast")
  const [selectedFilter, setSelectedFilter] = useState(params.type || "Breakfast");
  const [searchQuery, setSearchQuery] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Fetch recipes when filter changes
  useEffect(() => {
    loadRecipes();
  }, [selectedFilter]);

  const loadRecipes = async () => {
    setLoading(true);
    const data = await fetchRecipes(selectedFilter);
    setRecipes(data);
    setLoading(false);
  };

  // 3. Handle Selection (The "Return" Logic)
  const handleSelectRecipe = (recipe) => {
    // Emit an event that the Preview screen is listening for
    DeviceEventEmitter.emit('event.recipeSelected', recipe);
    router.back(); // Go back to Preview
  };

  // 4. Search Logic
  const filteredRecipes = recipes.filter(r => 
    r.mealName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#FFFFFF" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Recipes</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search color="#A0AEC0" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Recipe"
            placeholderTextColor="#A0AEC0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((type) => (
            <TouchableOpacity 
              key={type}
              style={[
                styles.filterChip, 
                selectedFilter === type && styles.filterChipActive
              ]}
              onPress={() => setSelectedFilter(type)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === type && styles.filterTextActive
              ]}>
                {type}
              </Text>
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
                <Image 
                  source={{ uri: item.image || "https://placehold.co/150x150/png" }} 
                  style={styles.cardImage} 
                />
                
                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.mealName}</Text>
                  <View style={styles.cardMetaRow}>
                    <Clock size={14} color="#718096" />
                    <Text style={styles.cardMetaText}>~{item.prepTime} mins</Text>
                  </View>
                </View>

                {/* Arrow */}
                <ChevronRight size={24} color="#CBD5E0" />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#5E8050', // Darker green from screenshot
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#5E8050', // Green border as per UI
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
  },
  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#EDF2F7',
  },
  filterChipActive: {
    backgroundColor: '#5E8050',
  },
  filterText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
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
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#CBD5E0',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 13,
    color: '#718096',
  },
});