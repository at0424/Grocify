import { addListItems } from '@/services/api'; // Import your API
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image, ScrollView, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native';

const THEME_GREEN = '#718F64'; 
const PLACEHOLDER_IMG = 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png'; // 1. Placeholder Image

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // 2. Safe Data Extraction
  // We parse 'currentQuantity' as an integer (default to 0 if missing)
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

    // 3. THE "DELTA" LOGIC (Crucial!)
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
  container: { flex: 1, backgroundColor: 'white' },
  headerContainer: {
    height: 300,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  backButton: {
    position: 'absolute', top: 50, left: 20,
    width: 40, height: 40, borderRadius: 20, backgroundColor: THEME_GREEN,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  productImage: { width: 180, height: 180, resizeMode: 'contain' },
  content: { paddingHorizontal: 25, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  category: { fontSize: 16, color: '#888', marginBottom: 25, fontWeight: '600' },
  sectionLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  description: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 30 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'space-between' },
  qtyLabel: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  counterContainer: { flexDirection: 'row', alignItems: 'center' },
  qtyValue: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 20, minWidth: 30, textAlign: 'center' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  addButton: {
    backgroundColor: THEME_GREEN, paddingVertical: 15, borderRadius: 15, alignItems: 'center',
  },
  addButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});