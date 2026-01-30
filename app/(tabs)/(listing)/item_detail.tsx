import { addListItems } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image, ScrollView, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native';

const THEME_GREEN = '#718F64'; 
const PLACEHOLDER_IMG = 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png'; 

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Data Extraction
  const initialQty = parseInt(params.currentQuantity || '0');
  const listId = params.listId;

  const item = {
    name: params.name || 'Unknown Item',
    category: params.category || 'General',
    description: params.description || 'No description available.',
    // If params.image is missing or empty, use the placeholder
    image: params.image || PLACEHOLDER_IMG, 
  };

  // Initialize state with the quantity the user ALREADY has (or 1 if they have none)
  const [quantity, setQuantity] = useState(initialQty > 0 ? initialQty : 1);
  const [saving, setSaving] = useState(false);

  // Helper to add item to recent history
  const addToHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('@recent_items');
      const currentHistory = stored ? JSON.parse(stored) : [];

      const newHistory = [
        item, // The current item object
        ...currentHistory.filter(i => i.name !== item.name)
      ].slice(0, 10);

      await AsyncStorage.setItem('@recent_items', JSON.stringify(newHistory));
    } catch (e) {
      console.log("Error saving history:", e);
    }
  };

  // --- UI Handlers ---
  const handleQuantity = (type) => {
    if (type === 'minus') {
      if (quantity > 0) setQuantity(quantity - 1);
    } else {
      setQuantity(quantity + 1);
    }
  };

  const handleSave = async () => {
    if (!listId) {
      Alert.alert("Error", "Missing List ID");
      return;
    }

    setSaving(true);

    // THE "DELTA" LOGIC 
    // Your backend ADDS whatever we send. 
    // If I have 2, and I want 5, I need to send +3.
    // If I have 2, and I want 1, I need to send -1.
    const delta = quantity - initialQty;

    if (delta === 0) {
      // No changes made
      router.back();
      return;
    }

    // Pass the 'delta' as the quantity string
    const result = await addListItems(listId, item.name, String(delta), item.category);
    
    setSaving(false);

    if (result.success) {
      await addToHistory();
      
      router.back();
    } else {
      Alert.alert("Error", "Could not update item.");
    }
  };

  return (
    <View style={styles.container}>
      
      {/* --- Header --- */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>

        <Image source={{ uri: item.image }} style={styles.productImage} />
      </View>

      {/* --- Content --- */}
      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>

        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.description}>
          {item.description} 
        </Text>

        {/* --- Quantity Selector --- */}
        <View style={styles.quantityRow}>
          <Text style={styles.qtyLabel}>Quantity</Text>
          
          <View style={styles.counterContainer}>
             <TouchableOpacity onPress={() => handleQuantity('minus')}>
               <Ionicons name="remove-circle" size={40} color={quantity === 0 ? "#ccc" : THEME_GREEN} />
             </TouchableOpacity>
             
             <Text style={styles.qtyValue}>{quantity}</Text>
             
             <TouchableOpacity onPress={() => handleQuantity('plus')}>
               <Ionicons name="add-circle" size={40} color={THEME_GREEN} />
             </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* --- Footer Button --- */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.addButtonText}>
              {initialQty > 0 ? "Update List" : "Add to List"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  // ==========================================
  // 1. LAYOUT & CONTAINERS
  // ==========================================
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    paddingHorizontal: 25,
    paddingBottom: 100, // Space for floating footer
  },

  // ==========================================
  // 2. HEADER (Image & Back Button)
  // ==========================================
  headerContainer: {
    height: 300,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    overflow: 'hidden',
    marginBottom: 20,
    // Shadow/Elevation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  productImage: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
  },

  // ==========================================
  // 3. PRODUCT TEXT INFO
  // ==========================================
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  category: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
    marginBottom: 25,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 30,
  },

  // ==========================================
  // 4. QUANTITY CONTROLS
  // ==========================================
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  qtyLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyValue: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 20,
    minWidth: 30,
  },

  // ==========================================
  // 5. FOOTER & ACTION BUTTON
  // ==========================================
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addButton: {
    backgroundColor: THEME_GREEN,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});