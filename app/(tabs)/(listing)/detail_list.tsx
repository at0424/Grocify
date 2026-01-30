import { fetchGroceryListDetails } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ListingDetailScreen() {
  const router = useRouter();
  const { listId, title } = useLocalSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Data
  useEffect(() => {
    loadItems();
  }, [listId]);

  const loadItems = async () => {
    if (!listId) return;
    setLoading(true);
    const data = await fetchGroceryListDetails(listId);
    console.log("Fetched Items:", data);
    setItems(data);
    setLoading(false);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <View style={styles.mainRow}>
        {/* Left Side: Bullet + Name */}
        <View style={styles.leftSide}>
          <View style={styles.bulletPoint} />
          <Text style={styles.itemText}>{item.name}</Text>
        </View>

        {/* Right Side: Quantity */}
        <View style={styles.rightSide}>
          {/* Changed 'quantityText' to 'qtyText' to match your styles */}
          <Text style={styles.qtyText}>{item.quantity || 1}</Text>
        </View>
      </View>
      
      <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginTop: 5 }} />
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={32} color="black" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{title || "Unnamed List"}</Text>

        <View style={styles.avatarStack}>
          <View style={[styles.avatar, { backgroundColor: '#ddd', right: 0, zIndex: 1 }]} />
          <View style={[styles.avatar, { backgroundColor: '#bbb', right: 15, zIndex: 0 }]} />
        </View>
      </View>

      {/* Content */}
     {loading ? (
        <ActivityIndicator size="large" color="#718F64" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => index.toString()} // Use unique ID if available later
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          
          // The Empty State You Requested
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>List Empty!</Text>
              <Text style={styles.emptySubtitle}>Please add some items to get started.</Text>
            </View>
          }
        />
      )}

      {/* --- Floating Action Button (+) --- */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('./grocery_item')}>
        <Ionicons name="add" size={30} color="#000" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  // =================================================
  // MAIN CONTAINER
  // =================================================
  container: {
    flex: 1,
    backgroundColor: '#FFF9C4', // The Pale Sticky Note Yellow
    paddingTop: 50, // Status bar spacing
  },

  // =================================================
  // HEADER
  // =================================================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'System', 
    color: '#333',
    flex: 1, 
    marginLeft: 10,
    textAlign: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    width: 50,
    height: 30,
    position: 'relative',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFF9C4', // Matches background for "cutout" effect
    position: 'absolute',
  },

  // =================================================
  // LIST CONTENT
  // =================================================
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra padding at bottom for the FAB
  },
  sectionContainer: {
    marginBottom: 10,
  },
  sectionHeader: {
    backgroundColor: '#E6EE9C', // Darker Yellow/Green header strip
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
    color: '#555',
  },

  // =================================================
  // ITEM ROWS
  // =================================================
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.4)', // Slight highlight for readability
    borderRadius: 10,
    // Optional: Border bottom to look like lined paper
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555',
    marginRight: 12,
  },
  itemText: {
    fontSize: 20,
    fontWeight: '400',
    color: '#333',
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: { // Renamed from 'qtyText' to match your JSX
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginRight: 5,
  },
  subText: {
    fontSize: 14,
    color: '#777',
    marginLeft: 30, // Indented under the text
    marginTop: -5,
    marginBottom: 10,
    fontStyle: 'italic',
  },

  // =================================================
  // STRIKETHROUGH / CHECKED STATE
  // =================================================
  strikethrough: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    opacity: 0.5,
  },
  crossLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'black',
    width: '100%',
    top: '50%', 
    opacity: 0.6,
  },

  // =================================================
  // EMPTY STATE
  // =================================================
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#777',
    fontStyle: 'italic',
  },

  // =================================================
  // FLOATING ACTION BUTTON (FAB)
  // =================================================
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCE775', // Pop color (Green/Yellow)
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});