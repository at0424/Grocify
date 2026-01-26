import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fetchGroceryCatalog } from '../../../services/api';
// Placeholder Images (Since we don't have real URLs in DB yet)
const PLACEHOLDER_IMG = 'https://via.placeholder.com/100';

// This matches the structure of the JSON you imported
const CATEGORIES = [
  { id: '1', name: 'Vegetable', icon: 'leaf', color: '#E8F5E9' },
  { id: '2', name: 'Meat', icon: 'nutrition', color: '#FFEBEE' },
  { id: '3', name: 'Fruit', icon: 'partly-sunny', color: '#FFFDE7' }, // fruity icon replacement
  { id: '4', name: 'Dairy', icon: 'water', color: '#E3F2FD' },
];


export default function AddItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const listName = params.title || 'My List'; 

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredItems = items.filter(item => {
    const itemData = item.name ? item.name.toUpperCase() : ''.toUpperCase();
    const textData = searchQuery.toUpperCase();
    
    return itemData.indexOf(textData) > -1;
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchGroceryCatalog(); ;

        setItems(data);
      } catch (e) {
        console.error("Failed to load catalog: ", e)
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <View style={styles.container}>
      
      {/* --- 1. Green Header Area --- */}
      <View style={styles.greenHeader}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{listName}</Text>
          <View style={{ width: 28 }}>
            <Text style={{ opacity: 0 }}>Placeholder</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#718F64" style={{ marginRight: 10 }} />
          <TextInput 
            placeholder="Search: Apple" 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={styles.contentContainer}>
        
        {/* --- 2. Recently Added Tags --- */}
        <Text style={styles.sectionTitle}>Recently Added</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
          {['Milk', 'Avocado', 'Nuts', 'Salmon'].map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <Ionicons name="close" size={14} color="#555" style={{ marginLeft: 5 }}/>
            </View>
          ))}
        </ScrollView>

        {/* --- 3. Categories (Round Icons) --- */}
        <View style={styles.categoryHeaderRow}>
           <Text style={styles.sectionTitle}>All Categories</Text>
        </View>
        
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.categoryItem}>
              <View style={[styles.iconCircle, { backgroundColor: cat.color }]}>
                <Ionicons name={cat.icon} size={24} color="#555" />
              </View>
              <Text style={styles.categoryText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- 4. Product Grid --- */}
        <View style={styles.itemsGrid}>
           {/* Check if we are loading first */}
           {loading ? (
             <ActivityIndicator size="large" color="#718F64" style={{ marginTop: 50 }} />
           ) : (
             filteredItems.map((item, index) => (
               <View key={index} style={styles.productCard}>
                 
                 {/* Image Area  */}
                 <View style={styles.iconContainer}>
                    {/* If you add icons later, you can conditionally render them here */}
                    <Image 
                      source={{ uri: 'https://via.placeholder.com/100' }} 
                      style={styles.productImage} 
                    />
                 </View>

                 {/* Item Name (e.g. "Cabbage") */}
                 <Text style={styles.productName} numberOfLines={1}>
                   {item.name}
                 </Text>
                 
                 {/* Description (e.g. "Round cabbage...") */}
                 <Text style={styles.productDesc} numberOfLines={2}>
                   {item.description}
                 </Text>
                 
                 {/* Add Button */}
                 <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => console.log(`Added ${item.name}`)}
                 >
                   <Ionicons name="add" size={20} color="white" />
                 </TouchableOpacity>

               </View>
             ))
           )}
        </View>

      </ScrollView>

      {/* --- 5. Floating "Review List" Button (Bottom Right) --- */}
      <TouchableOpacity style={styles.floatingListBtn} onPress={() => router.back()}>
        <Ionicons name="list" size={28} color="#4A4A4A" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  greenHeader: {
    backgroundColor: '#718F64', // Matching your Moss Green
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  tagScroll: {
    marginBottom: 20,
    flexDirection: 'row',
  },
  tag: {
    backgroundColor: '#DCE775', // Light green tag color
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  tagText: {
    fontWeight: '600',
    color: '#333',
  },
  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  categoryItem: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%', // Forces 2 columns
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 12,
    alignItems: 'center',
    marginBottom: 15,
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F8E9', // Light green circle background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  productName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  productDesc: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginBottom: 15, // Space for the button
    lineHeight: 14,
  },
  addButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#718F64',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingListBtn: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8FA37E', // Slightly different green for the FAB
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});